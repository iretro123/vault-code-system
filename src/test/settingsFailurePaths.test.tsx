import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ query: vi.fn(), error: vi.fn(), success: vi.fn(), refetch: vi.fn(), updatePrefs: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({useAuth: () => ({user: {id:'member'}, refetchProfile:mock.refetch})}));
vi.mock('@/hooks/useUserPreferences', () => ({useUserPreferences: () => ({prefs:null,loading:false,updatePrefs:mock.updatePrefs})}));
vi.mock('@/integrations/supabase/localPreviewFetch', () => ({isLocalDesignPreview: () => false}));
vi.mock('@/components/settings/DeleteAccountCard', () => ({DeleteAccountCard: () => null}));
vi.mock('sonner', () => ({toast:{error:mock.error,success:mock.success}}));
vi.mock('@/integrations/supabase/client', () => ({supabase:{from: () => {
 const chain = {select:()=>chain, update:()=>chain, delete:()=>chain, eq:()=>chain, order:()=>chain, limit:()=>chain, maybeSingle:()=>chain, then:(resolve:(value: unknown) => unknown,reject:(reason: unknown) => unknown)=>mock.query().then(resolve,reject)};
 return chain;
}}}));
import { SettingsSecurity } from '@/components/settings/SettingsSecurity';
import { SettingsPrivacy } from '@/components/settings/SettingsPrivacy';
import { SettingsTradingPrefs } from '@/components/settings/SettingsTradingPrefs';
beforeEach(()=>{vi.clearAllMocks();mock.query.mockResolvedValue({data:null,error:{message:'Denied'}});mock.updatePrefs.mockResolvedValue(false);});
afterEach(cleanup);
it('stops a rejected Trade OS reset without success or redirect',async()=>{
 render(<MemoryRouter><SettingsSecurity/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Reset Trade OS'}));
 fireEvent.click(screen.getByRole('button',{name:'Yes, Reset Everything'}));
 await waitFor(()=>expect(mock.error).toHaveBeenCalled());
 expect(mock.query).toHaveBeenCalledTimes(1);expect(mock.success).not.toHaveBeenCalled();expect(mock.refetch).not.toHaveBeenCalled();
});
it('does not export incomplete data after any query error',async()=>{
 render(<MemoryRouter><SettingsPrivacy/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Download My Data'}));
 await waitFor(()=>expect(mock.error).toHaveBeenCalledWith('Export failed. Try again.'));
 expect(mock.success).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Download My Data'})).not.toBeDisabled();
});
it('reports preference save failure and re-enables retry',async()=>{
 render(<SettingsTradingPrefs/>);
 fireEvent.click(screen.getByRole('button',{name:'Save Preferences'}));
 await waitFor(()=>expect(mock.error).toHaveBeenCalled());
 expect(screen.queryByText('Saved')).toBeNull();
 expect(screen.getByRole('button',{name:'Save Preferences'})).not.toBeDisabled();
});

it('does not advertise an unimplemented automatic trading pause',()=>{
 render(<SettingsTradingPrefs/>);
 expect(screen.queryByText('Session Auto-Pause')).toBeNull();
 expect(screen.queryByText(/auto-pauses/)).toBeNull();
});
