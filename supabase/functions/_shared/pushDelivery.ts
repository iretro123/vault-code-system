export type PushOutcome = 'sent' | 'skipped' | 'retry' | 'dead';
export interface PushDelivery {
  eligible: () => Promise<boolean>;
  send: () => Promise<{ sent: number; invalidTokens: string[]; failureCode?: string }>;
  removeInvalid: () => Promise<void>;
  finish: (outcome: PushOutcome, failureCode: string | null) => Promise<void>;
}
/** One device failing must not mark the other devices delivered, or lose retries. */
export async function deliverPushJob(job: PushDelivery): Promise<PushOutcome> {
  let outcome: PushOutcome = 'retry';
  let failureCode: string | null = null;
  try {
    if (!await job.eligible()) outcome = 'skipped';
    else {
      const result = await job.send();
      if (result.sent > 0) outcome = 'sent';
      else {
        failureCode = /^(apns|fcm|web):(configuration|[0-9]{3})(:[A-Za-z]{1,64})?$/.test(result.failureCode || '') ? result.failureCode! : 'provider_rejected';
        if (result.invalidTokens.length) {
          await job.removeInvalid();
          outcome = 'dead';
        }
      }
    }
  } catch (error) {
    outcome = 'retry';
    failureCode = error instanceof Error && ['TimeoutError','AbortError'].includes(error.name) ? 'provider_timeout' : 'delivery_exception';
  }
  // Let a failed acknowledgement retain the lease for retry after expiration.
  await job.finish(outcome, failureCode);
  return outcome;
}
