import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
vi.mock('@/hooks/useAuth', () => ({useAuth: () => ({user:{id:'owner'}})}));
vi.mock('@/integrations/supabase/client', () => ({supabase:{}}));
import {SignalPostForm} from '@/components/academy/chat/SignalPostForm';
afterEach(() => {cleanup();sessionStorage.clear();vi.restoreAllMocks();});
it('requires a positive strike and valid optional fill before posting a live signal', () => {
 render(<SignalPostForm onSubmit={vi.fn()} sending={false} roomSlug="test"/>);
 fireEvent.click(screen.getByRole('button',{name:'Create signal or watchlist'}));
 expect(screen.getByRole('button',{name:'Collapse signal form'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Live Signal'}));
 fireEvent.change(screen.getByPlaceholderText('Ticker'),{target:{value:'SPY'}});
 for (const value of ['oops','0','-5','Infinity']) {
  fireEvent.change(screen.getByLabelText('Strike price'),{target:{value}});
  expect(screen.getByRole('button',{name:'Post Signal'})).toBeDisabled();
 }
 fireEvent.change(screen.getByLabelText('Strike price'),{target:{value:'765.5'}});
 expect(screen.getByRole('button',{name:'Post Signal'})).toBeEnabled();
 fireEvent.change(screen.getByLabelText('Fill price'),{target:{value:'abc'}});
 expect(screen.getByRole('button',{name:'Post Signal'})).toBeDisabled();
});
it('keeps the composer usable when storage writes are blocked', () => {
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => {throw new Error('denied');});
 render(<SignalPostForm onSubmit={vi.fn()} sending={false} roomSlug="test"/>);
 fireEvent.click(screen.getByRole('button',{name:'Create signal or watchlist'}));
 expect(screen.getByRole('button',{name:'Collapse signal form'})).toBeInTheDocument();
});
