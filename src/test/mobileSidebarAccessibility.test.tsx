import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
afterEach(() => {cleanup();vi.restoreAllMocks();});
it('opens a mobile navigation dialog with an actual Radix title and no missing-title warning', () => {
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 render(<SidebarProvider><SidebarTrigger/><Sidebar><a href="/academy/home">Home</a></Sidebar></SidebarProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Toggle Sidebar'}));
 const dialog=screen.getByRole('dialog',{name:'Navigation menu'});
 expect(dialog).toBeTruthy();
 expect(screen.getByRole('heading',{name:'Navigation menu'})).toHaveClass('sr-only');
 expect(error.mock.calls.flat().join(' ')).not.toMatch(/requires a.*Title/);
 expect(warn.mock.calls.flat().join(' ')).not.toMatch(/Missing.*Description/);
});
