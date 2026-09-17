import {act,cleanup,fireEvent,render,renderHook,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),upload:vi.fn(),signed:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,storage:{from:()=>({upload:mock.upload,createSignedUrl:mock.signed})}}}));
vi.mock('@/integrations/supabase/localPreviewFetch',()=>({isLocalDesignPreview:()=>true}));
vi.mock('@/components/academy/chat/GifPicker',()=>({GifPicker:({onSelect}:{onSelect:(url:string)=>void})=><button onClick={()=>onSelect('https://media.giphy.com/media/example/giphy.gif')}>Choose GIF</button>}));
vi.mock('@/components/academy/chat/EmojiPicker',()=>({EmojiPicker:({onSelect}:{onSelect:(emoji:string)=>void})=><button onClick={()=>onSelect('🎉')}>Choose emoji</button>}));
import {useMemberFriends} from '@/hooks/useMemberFriends';
import {MemberMediaTools} from '@/components/academy/dm/MemberMedia';
import {validateMemberFile} from '@/lib/memberAttachments';
import {MemberMessageSearch} from '@/components/academy/dm/MemberMessageSearch';
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});
it('requires a request rather than declaring the other person a friend',async()=>{
 const {result}=renderHook(()=>useMemberFriends('me'));
 const peer={user_id:'other',display_name:'Other',avatar_url:null};
 await act(async()=>result.current.change(peer,'request'));
 expect(result.current.friends[0].accepted).toBe(false);
 await act(async()=>result.current.change(peer,'remove'));
 expect(result.current.friends).toEqual([]);expect(mock.rpc).not.toHaveBeenCalled();
});
it('validates file types and size',()=>{
 expect(validateMemberFile({type:'text/html',size:10})).toMatch('Choose');
 expect(validateMemberFile({type:'image/png',size:16*1024*1024})).toMatch('15 MB');
 expect(validateMemberFile({type:'application/pdf',size:100})).toBeNull();
});
it('previews and sends a local file without uploading to storage',async()=>{
 URL.createObjectURL=vi.fn(()=> 'blob:local-test');
 const send=vi.fn().mockResolvedValue(true),emoji=vi.fn();
 render(<MemberMediaTools conversation="demo" userId="me" disabled={false} onEmoji={emoji} onSend={send}/>);
 fireEvent.change(screen.getByLabelText('Choose attachment'),{target:{files:[new File(['sample'],'chart.png',{type:'image/png'})]}});
 expect(screen.getByText('chart.png')).toBeInTheDocument();expect(send).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Send attachment'}));
 await waitFor(()=>expect(send).toHaveBeenCalledWith(expect.objectContaining({type:'image',url:'blob:local-test',filename:'chart.png'})));
 expect(mock.upload).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Choose emoji'}));expect(emoji).toHaveBeenCalledWith('🎉');
 fireEvent.click(screen.getByRole('button',{name:'Choose GIF'}));expect(send).toHaveBeenCalledWith({type:'gif',url:'https://media.giphy.com/media/example/giphy.gif'});
});
it('searches message content and clears results when switching conversations',async()=>{
 const messages=[{id:'a',sender_id:'other',conversation_id:'c',body:'Review the demand zone',created_at:new Date().toISOString()}];
 const view=render(<MemberMessageSearch conversation="c" preview messages={messages}/>);
 fireEvent.click(screen.getByRole('button',{name:'Find a message'}));
 fireEvent.change(screen.getByRole('textbox',{name:'Search this conversation'}),{target:{value:'demand'}});
 expect(await screen.findByText('Review the demand zone')).toBeInTheDocument();
 view.rerender(<MemberMessageSearch conversation="other" preview messages={[]}/>);
 expect(screen.queryByText('Review the demand zone')).not.toBeInTheDocument();expect(mock.rpc).not.toHaveBeenCalled();
});
