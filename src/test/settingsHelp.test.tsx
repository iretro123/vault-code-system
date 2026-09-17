import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {SettingsHelp} from '@/components/settings/SettingsHelp';
afterEach(cleanup);
function Location(){return <output>{useLocation().pathname}</output>}
it('opens the coach drawer and sends setup to the actual checklist',()=>{
 const coach=vi.fn();window.addEventListener('toggle-coach-drawer',coach);
 render(<MemoryRouter><SettingsHelp/><Location/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Open Ask Coach'}));
 expect(coach).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Getting started'}));
 expect(screen.getByText('/academy/setup')).toBeTruthy();
 expect(screen.getByRole('link',{name:'Contact Support'}).getAttribute('href')).toBe('mailto:vault@vaulttradingacademy.com');
 window.removeEventListener('toggle-coach-drawer',coach);
});
