import {describe,it,expect,vi} from 'vitest';
import {frameChart} from '../../workers/pulse-spy/capture-framing.js';
function setup() {
 return {$:vi.fn().mockResolvedValue({click:vi.fn()}),keyboard:{press:vi.fn(),down:vi.fn(),up:vi.fn()},mouse:{move:vi.fn()},evaluate:vi.fn()};
}
describe('repeatable capture framing',()=>{
 it('resets every capture so zoom does not accumulate',async()=>{
  const page=setup();await frameChart(page);await frameChart(page);
  expect(page.keyboard.press.mock.calls.filter(([key])=>key==='r')).toHaveLength(2);
  expect(page.keyboard.press.mock.calls.filter(([key])=>key==='ArrowUp')).toHaveLength(12);
  expect(page.mouse.move).toHaveBeenLastCalledWith(0,0);
 });
 it('releases keyboard modifiers after a failed zoom',async()=>{
  const page=setup();page.keyboard.press.mockImplementation(async key=>{if(key==='ArrowUp')throw Error('browser lost');});
  await expect(frameChart(page)).rejects.toThrow('browser lost');
  expect(page.keyboard.up).toHaveBeenCalledWith('Alt');expect(page.keyboard.up).toHaveBeenCalledWith('Control');
 });
 it('fails safely without a chart',async()=>{
  const page=setup();page.$.mockResolvedValue(null);
  await expect(frameChart(page)).rejects.toThrow('chart-crop-unavailable');
  expect(page.keyboard.press).not.toHaveBeenCalled();
 });
});
