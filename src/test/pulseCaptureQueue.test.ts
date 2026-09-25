import { beforeEach, describe, expect, it, vi } from 'vitest';
const capture=vi.hoisted(()=>({drainCaptures:vi.fn()}));
vi.mock('../../workers/pulse-spy/capture.js',()=>capture);
import worker from '../../workers/pulse-spy/capture-worker.js';
beforeEach(()=>vi.clearAllMocks());
describe('persistent chart queue',()=>{
  it('acknowledges a webhook wake only after queue persistence, without running a browser in HTTP background work',async()=>{
    let release:()=>void=()=>{};
    const send=vi.fn(()=>new Promise<void>(resolve=>{release=resolve;}));
    let returned=false;
    const result=worker.fetch(new Request('https://capture.internal/drain',{method:'POST',headers:{Authorization:'Bearer test'}}),{WORKER_TOKEN:'test',CAPTURE_JOBS:{send}}).then(r=>{returned=true;return r;});
    await Promise.resolve();expect(returned).toBe(false);expect(send).toHaveBeenCalledWith({kind:'capture-wake'});
    release();expect((await result).status).toBe(202);expect(capture.drainCaptures).not.toHaveBeenCalled();
  });
  it('does not accept an unauthorized wake',async()=>{
    const send=vi.fn();
    expect((await worker.fetch(new Request('https://capture.internal/drain',{method:'POST'}),{WORKER_TOKEN:'test',CAPTURE_JOBS:{send}})).status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });
  it('retries failed work and acknowledges only a completed drain',async()=>{
    const message={ack:vi.fn(),retry:vi.fn()};capture.drainCaptures.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await worker.queue({messages:[message]},{});
    expect(message.retry).toHaveBeenCalledWith({delaySeconds:10});expect(message.ack).not.toHaveBeenCalled();
    await worker.queue({messages:[message]},{});expect(message.ack).toHaveBeenCalledOnce();
  });
});
