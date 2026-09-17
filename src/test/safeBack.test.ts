import {afterEach, expect, it, vi} from 'vitest';
import {safeBack} from '../lib/safeBack';

afterEach(()=>window.history.replaceState(null,''));
it('returns through router history when there is an app entry',()=>{
  window.history.replaceState({idx:2},'');
  const navigate=vi.fn();safeBack(navigate,'/academy/home');
  expect(navigate).toHaveBeenCalledWith(-1);
});
it.each([null,{}, {idx:0}, {idx:-1}])('uses a safe fallback for direct entry: %j',state=>{
  window.history.replaceState(state,'');
  const navigate=vi.fn();safeBack(navigate,'/academy/home');
  expect(navigate).toHaveBeenCalledWith('/academy/home',{replace:true});
});
