import { expect, it, vi } from 'vitest';
import { deliverPushJob } from '../../supabase/functions/_shared/pushDelivery';
function fixture() { return { eligible:vi.fn().mockResolvedValue(true), send:vi.fn().mockResolvedValue({sent:1,invalidTokens:[]}), removeInvalid:vi.fn().mockResolvedValue(undefined), finish:vi.fn().mockResolvedValue(undefined) }; }
it('keeps a failed device retryable while acknowledging successful devices',async()=>{
 const a=fixture(),b=fixture(); b.send.mockRejectedValue(new Error('timeout'));
 expect(await Promise.all([deliverPushJob(a),deliverPushJob(b)])).toEqual(['sent','retry']);
 expect(a.finish).toHaveBeenCalledWith('sent'); expect(b.finish).toHaveBeenCalledWith('retry');
});
it('rechecks bans, mutes and deleted-message eligibility before sending',async()=>{
 const job=fixture();job.eligible.mockResolvedValue(false);
 expect(await deliverPushJob(job)).toBe('skipped');expect(job.send).not.toHaveBeenCalled();
});
it('retries an eligibility lookup outage rather than discarding the notification',async()=>{
 const job=fixture();job.eligible.mockRejectedValue(new Error('offline'));
 expect(await deliverPushJob(job)).toBe('retry');expect(job.send).not.toHaveBeenCalled();
});
it('retires invalid tokens without retrying them forever',async()=>{
 const job=fixture();job.send.mockResolvedValue({sent:0,invalidTokens:['test']});
 expect(await deliverPushJob(job)).toBe('dead');expect(job.removeInvalid).toHaveBeenCalledOnce();
});
it('does not claim acknowledgement if the database lease is lost',async()=>{
 const job=fixture();job.finish.mockRejectedValue(new Error('lease lost'));
 await expect(deliverPushJob(job)).rejects.toThrow('lease lost');
});
