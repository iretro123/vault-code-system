import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
const subscription=vi.hoisted(()=>vi.fn());
const prefs=vi.hoisted(()=>({notifications_enabled:true}));
vi.mock('@/hooks/useUserPreferences',()=>({useUserPreferences:()=>({prefs,loading:false,updatePrefs:vi.fn()})}));
vi.mock('@/hooks/useOSNotifications',()=>({useOSNotifications:()=>({requestIfNeeded:vi.fn()})}));
vi.mock('@/lib/pushPermission',()=>({getPushPermissionState:vi.fn(),requestPushPermission:vi.fn()}));
vi.mock('@/lib/webPush',()=>({supportsWebPush:()=>true,hasWebPushSubscription:subscription}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>false}}));
import {SettingsNotifications} from '@/components/settings/SettingsNotifications';
afterEach(cleanup);
it('keeps permission recovery available if browser subscription inspection rejects',async()=>{
 subscription.mockRejectedValue(new Error('service worker inaccessible'));
 render(<SettingsNotifications/>);
 await waitFor(()=>expect(subscription).toHaveBeenCalled());
 expect(screen.getByRole('button',{name:'Enable Device Alerts'})).toBeEnabled();
 expect(screen.queryByText('This device is allowed to receive Vault OS alerts.')).not.toBeInTheDocument();
});
