import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mocks=vi.hoisted(()=>({update:vi.fn().mockResolvedValue(false),error:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'test'}})}));
vi.mock('@/hooks/useUserPreferences',()=>({useUserPreferences:()=>({prefs:null,loading:false,updatePrefs:mocks.update})}));
vi.mock('@/hooks/useOSNotifications',()=>({useOSNotifications:()=>({requestIfNeeded:vi.fn()})}));
vi.mock('sonner',()=>({toast:{error:mocks.error}}));
import {SignalPostForm} from '@/components/academy/chat/SignalPostForm';
import {SettingsNotifications} from '@/components/settings/SettingsNotifications';
afterEach(()=>{cleanup();sessionStorage.clear();vi.clearAllMocks();});
it('retains quick signal ticker after a failed send',async()=>{
 render(<SignalPostForm roomSlug="signals" sending={false} onSubmit={async()=>false}/>);
 fireEvent.click(screen.getByText('Quick watchlist'));
 const input=screen.getByPlaceholderText('Quick watchlist — type ticker');
 fireEvent.change(input,{target:{value:'NVDA'}});
 fireEvent.click(screen.getByRole('button',{name:'Post quick watchlist'}));
 await waitFor(()=>expect(input).toHaveValue('NVDA'));
});
it('retains the full structured signal form after a failed send',async()=>{
 sessionStorage.setItem('vault_signal_draft_signals',JSON.stringify({open:true,ticker:'AMD',notes:'Wait for confirmation',levels:'100 / 105'}));
 const submit=vi.fn().mockResolvedValue(false);
 render(<SignalPostForm roomSlug="signals" sending={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Post Watchlist'}));
 await waitFor(()=>expect(submit).toHaveBeenCalled());
 expect(screen.getByPlaceholderText('Ticker (e.g. SPY)')).toHaveValue('AMD');
 expect(screen.getByPlaceholderText('Quick thesis or notes (optional)')).toHaveValue('Wait for confirmation');
 expect(screen.getByPlaceholderText('Key levels (e.g. 540 / 545)')).toHaveValue('100 / 105');
});
it('keeps notification switch unchanged and reports failed save',async()=>{
 render(<SettingsNotifications/>);
 const control=screen.getByRole('switch',{name:'Enable Notifications'});
 fireEvent.click(control);
 await waitFor(()=>expect(mocks.error).toHaveBeenCalled());
 expect(control).toHaveAttribute('aria-checked','true');
 expect(control).not.toBeDisabled();
});
