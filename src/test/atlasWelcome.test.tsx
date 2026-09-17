import {afterEach,describe,it,expect,vi} from 'vitest';
import {act,cleanup,render,screen} from '@testing-library/react';
import AtlasWelcome from '@/components/academy/atlas/AtlasWelcome';
import {vaultResourceFor} from '../../supabase/functions/_shared/atlasVaultKnowledge';
import {answerGuide} from '../../supabase/functions/_shared/atlasFoundation';
import {buildAtlasPrompt} from '../../supabase/functions/_shared/atlasTeachingContract';
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
describe('Atlas welcome and public resources',()=>{
 it('types without hiding the accessible heading, finishes, and cleans timers',()=>{
  vi.useFakeTimers();
  const {container,unmount}=render(<AtlasWelcome name="RZ" active skip={false}/>);
  expect(screen.getByRole('heading',{name:'Hey RZ. What are you working on?'})).toBeTruthy();
  expect(container.querySelector('.atlas-type-ink')?.textContent).toBe('');
  act(()=>vi.advanceTimersByTime(170));
  expect(container.querySelector('.atlas-type-ink')?.textContent).toBe('Hey R');
  act(()=>vi.advanceTimersByTime(5000));
  expect(container.querySelector('.atlas-type-caret')).toBeNull();
  unmount();expect(vi.getTimerCount()).toBe(0);
 });
 it('shows immediately when the learner starts typing',()=>{
  const {container}=render(<AtlasWelcome name="RZ" active skip/>);
  expect(container.querySelector('.atlas-type-ink')?.textContent).toBe('Hey RZ. What are you working on?');
 });
 it('respects reduced motion',()=>{
  vi.spyOn(window,'matchMedia').mockReturnValue({matches:true} as MediaQueryList);
  const {container}=render(<AtlasWelcome name="RZ" active skip={false}/>);
  expect(container.querySelector('.atlas-type-caret')).toBeNull();
 });
 it('only suggests curated resources when relevant',()=>{
  expect(vaultResourceFor('What is our IG?')?.url).toBe('https://www.instagram.com/rubenzamora__/');
  expect(vaultResourceFor('a video on demand zones')?.url).toContain('-_nlVEipvJE');
  expect(vaultResourceFor('I lost money today')).toBeUndefined();
  expect(answerGuide('how do I use this app?').text).toContain('Settings');
  expect(buildAtlasPrompt([],[])).toContain('Never invent a handle');
  expect(answerGuide('How do I size stock risk?').topic).toBe('risk');
  expect(answerGuide('What are shares?').topic).toBe('stocks');
 });
});
