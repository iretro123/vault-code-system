import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {NativeEmojiPicker} from '@/components/academy/chat/NativeEmojiPicker';
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
it('searches, clears, switches categories and closes without selecting',()=>{
 const select=vi.fn(),close=vi.fn();render(<NativeEmojiPicker onSelect={select} onClose={close}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Search emojis'}),{target:{value:'rocket'}});
 expect(screen.getByRole('button',{name:'Rocket'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Frequently used'}));
 expect(screen.getByRole('textbox',{name:'Search emojis'})).toHaveValue('');
 fireEvent.click(screen.getByRole('button',{name:'Close emoji picker'}));expect(close).toHaveBeenCalledOnce();expect(select).not.toHaveBeenCalled();
});
it('still selects when browser storage is unavailable',()=>{
 const select=vi.fn();vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked');});
 render(<NativeEmojiPicker onSelect={select}/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Search emojis'}),{target:{value:'rocket'}});
 fireEvent.click(screen.getByRole('button',{name:'Rocket'}));expect(select).toHaveBeenCalledWith('🚀');
});
