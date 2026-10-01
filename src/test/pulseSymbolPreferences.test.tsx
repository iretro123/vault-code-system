import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {SettingsNotifications} from '@/components/settings/SettingsNotifications';
const state=vi.hoisted(()=>({prefs:{notifications_enabled:true,notify_pulse:true,notify_pulse_spy:true,notify_pulse_qqq:false},save:vi.fn()}));
vi.mock('@/hooks/useUserPreferences',()=>({useUserPreferences:()=>({prefs:state.prefs,loading:false,updatePrefs:state.save})}));
vi.mock('@/hooks/useOSNotifications',()=>({useOSNotifications:()=>({requestIfNeeded:vi.fn()})}));
vi.mock('@/lib/pushPermission',()=>({getPushPermissionState:vi.fn(),requestPushPermission:vi.fn()}));
vi.mock('@/lib/webPush',()=>({supportsWebPush:()=>false,hasWebPushSubscription:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>false}}));
afterEach(()=>{cleanup();state.prefs.notifications_enabled=true;state.prefs.notify_pulse=true;vi.clearAllMocks();});
it('keeps QQQ opt-in separate from existing SPY alerts',async()=>{
 state.save.mockResolvedValue(true);render(<SettingsNotifications/>);
 expect(screen.getByRole('switch',{name:'QQQ Pulse alerts'})).toHaveAttribute('aria-checked','false');
 expect(screen.getByRole('switch',{name:'SPY Pulse alerts'})).toHaveAttribute('aria-checked','true');
 fireEvent.click(screen.getByRole('switch',{name:'QQQ Pulse alerts'}));
 await waitFor(()=>expect(state.save).toHaveBeenCalledWith({notify_pulse_qqq:true}));
 expect(screen.getByText(/Coming soon/)).toBeTruthy();
});
it('disables symbol controls when Pulse is disabled',()=>{
 state.prefs.notify_pulse=false;render(<SettingsNotifications/>);
 expect(screen.getByRole('switch',{name:'QQQ Pulse alerts'})).toBeDisabled();
 expect(screen.getByRole('switch',{name:'SPY Pulse alerts'})).toBeDisabled();
});
it('does not show a failed preference save as enabled',async()=>{
 state.save.mockResolvedValue(false);render(<SettingsNotifications/>);
 fireEvent.click(screen.getByRole('switch',{name:'QQQ Pulse alerts'}));
 await waitFor(()=>expect(state.save).toHaveBeenCalled());
 expect(screen.getByRole('switch',{name:'QQQ Pulse alerts'})).toHaveAttribute('aria-checked','false');
});
