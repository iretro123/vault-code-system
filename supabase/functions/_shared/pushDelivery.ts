export type PushOutcome = 'sent' | 'skipped' | 'retry' | 'dead';
export interface PushDelivery {
  eligible: () => Promise<boolean>;
  send: () => Promise<{ sent: number; invalidTokens: string[] }>;
  removeInvalid: () => Promise<void>;
  finish: (outcome: PushOutcome) => Promise<void>;
}
/** One device failing must not mark the other devices delivered, or lose retries. */
export async function deliverPushJob(job: PushDelivery): Promise<PushOutcome> {
  let outcome: PushOutcome = 'retry';
  try {
    if (!await job.eligible()) outcome = 'skipped';
    else {
      const result = await job.send();
      if (result.sent > 0) outcome = 'sent';
      else if (result.invalidTokens.length) {
        await job.removeInvalid();
        outcome = 'dead';
      }
    }
  } catch { outcome = 'retry'; }
  // Let a failed acknowledgement retain the lease for retry after expiration.
  await job.finish(outcome);
  return outcome;
}
