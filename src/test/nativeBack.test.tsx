import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { handleNativeBack } from '@/lib/nativeBack';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('dismisses the chart dialog instead of navigating away', async () => {
  function Example() {
    const [open, setOpen] = useState(true);
    return <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Chart</DialogTitle><DialogDescription>Saved chart</DialogDescription></DialogContent></Dialog>;
  }
  render(<Example />);
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  const exit = vi.fn();
  fireEvent(document, new Event('focus'));
  handleNativeBack(true, exit);
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(back).not.toHaveBeenCalled();
  expect(exit).not.toHaveBeenCalled();
});

it('uses native navigation normally without an overlay', () => {
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  const exit = vi.fn();
  handleNativeBack(true, exit);
  expect(back).toHaveBeenCalledOnce();
  handleNativeBack(false, exit);
  expect(exit).toHaveBeenCalledOnce();
});
