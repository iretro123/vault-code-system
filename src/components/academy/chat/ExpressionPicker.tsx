import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NativeEmojiPicker } from './NativeEmojiPicker';
import { GifPicker } from './GifPicker';

export function ExpressionPicker({onEmoji,onGif}:{onEmoji:(emoji:string)=>void;onGif:(url:string)=>void}) {
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState<'emoji'|'gif'>('emoji');
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" className="community-expression-trigger" aria-label="Emojis and GIFs"><Smile size={22}/></button></PopoverTrigger>
    <PopoverContent side="top" align="end" sideOffset={8} collisionPadding={8} onOpenAutoFocus={e=>e.preventDefault()} className="community-expression-picker">
      <div className="community-expression-tabs" role="group" aria-label="Expression type">
        <button type="button" aria-pressed={mode==='emoji'} onClick={()=>setMode('emoji')}>Emojis</button>
        <button type="button" aria-pressed={mode==='gif'} onClick={()=>setMode('gif')}>GIFs</button>
      </div>
      {mode==='emoji'?<NativeEmojiPicker onClose={()=>setOpen(false)} onSelect={emoji=>{onEmoji(emoji);setOpen(false);}}/>:<GifPicker embedded onClose={()=>setOpen(false)} onSelect={url=>{onGif(url);setOpen(false);}}/>}
    </PopoverContent>
  </Popover>;
}
