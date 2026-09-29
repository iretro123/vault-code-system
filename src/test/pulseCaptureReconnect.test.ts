import { describe, expect, it, vi } from 'vitest';
import { reconnectChart } from '../../workers/pulse-spy/capture-reconnect.js';
function setup(disconnected=true,last:string|null=null,text='Connect') {
 const button={boundingBox:vi.fn().mockResolvedValue({width:80,height:30}),evaluate:vi.fn().mockResolvedValue(text),click:vi.fn()};
 const page={evaluate:vi.fn().mockResolvedValue(disconnected),$$:vi.fn().mockResolvedValue([button]),waitForFunction:vi.fn()};
 const env={CHART_IMAGES:{get:vi.fn().mockResolvedValue(last),put:vi.fn()}};
 return {button,page,env};
}
describe('bounded chart reconnect',()=>{
 it('leaves a connected chart alone',async()=>{
  const {page,env}=setup(false);await reconnectChart(env,page);
  expect(page.$$).not.toHaveBeenCalled();expect(env.CHART_IMAGES.put).not.toHaveBeenCalled();
 });
 it('reconnects once and waits for the disconnection notice to clear',async()=>{
  const {button,page,env}=setup();await reconnectChart(env,page);
  expect(env.CHART_IMAGES.put).toHaveBeenCalledWith('private:last-reconnect-at',expect.any(String),{expirationTtl:600});
  expect(button.click).toHaveBeenCalledOnce();expect(page.waitForFunction).toHaveBeenCalledOnce();
 });
 it('stops repeated account conflicts during cooldown',async()=>{
  const {button,page,env}=setup(true,String(Date.now()));
  await expect(reconnectChart(env,page)).rejects.toThrow('chart-session-conflict');
  expect(button.click).not.toHaveBeenCalled();
 });
 it('never substitutes a sign-in or upgrade action for Connect',async()=>{
  const {button,page,env}=setup(true,null,'Sign in');
  await expect(reconnectChart(env,page)).rejects.toThrow('chart-session-conflict');
  expect(button.click).not.toHaveBeenCalled();
 });
 it('keeps the cooldown when reconnect fails',async()=>{
  const {page,env}=setup();page.waitForFunction.mockRejectedValue(new Error('timeout'));
  await expect(reconnectChart(env,page)).rejects.toThrow('timeout');
  expect(env.CHART_IMAGES.put).toHaveBeenCalledOnce();
 });
});
