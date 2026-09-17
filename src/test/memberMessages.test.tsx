import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const mock=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),preview:true}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,from:mock.from}}));
vi.mock('@/integrations/supabase/localPreviewFetch',()=>({isLocalDesignPreview:()=>mock.preview}));
vi.mock('@/lib/memberDirectory',()=>({readCommunityDirectory:async()=>[{user_id:'rz',display_name:'RZ',avatar_url:null,is_rz:true},{user_id:'jordan',display_name:'Jordan',avatar_url:null}]}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'me'},profile:{display_name:'Test Member',avatar_url:null}})}));
vi.mock('@/lib/chatAvatars',()=>({ChatAvatar:({userName}:{userName:string})=><span aria-label={`Avatar ${userName}`}/> }));
import { mergeMemberMessages, useMemberMessages, sampleMembers, type MemberMessage } from '@/hooks/useMemberMessages';
import AcademyMessages from '@/pages/academy/AcademyMessages';
afterEach(()=>{cleanup();vi.clearAllMocks();sessionStorage.clear();});
const message=(id:string,body='hello'):MemberMessage=>({id,body,conversation_id:'c',sender_id:'me',created_at:'2026-09-16T12:00:00Z'});
describe('member message reconciliation',()=>{
 it('replaces a pending row by ID without duplicating the realtime echo',()=>{
   expect(mergeMemberMessages([{...message('1'),status:'sending'}],[message('1')])).toEqual([message('1')]);
 });
 it('does not merge two separate messages with identical text',()=>{
   expect(mergeMemberMessages([message('1')],[message('2')])).toHaveLength(2);
 });
});
describe('local member messaging isolation',()=>{
 it('sends and switches conversations without any backend write',async()=>{
   const view=renderHook(({id})=>useMemberMessages('me',id),{initialProps:{id:'demo-conversation'}});
   await act(async()=>{expect(await view.result.current.send('Local test')).toBe(true);});
   expect(view.result.current.messages.at(-1)?.body).toBe('Local test');
   let id:string|null=null;
   await act(async()=>{id=await view.result.current.open(sampleMembers[1]);});
   view.rerender({id:id!});expect(view.result.current.messages).toHaveLength(0);
   view.rerender({id:'demo-conversation'});expect(view.result.current.messages.at(-1)?.body).toBe('Local test');
   expect(mock.rpc).not.toHaveBeenCalled();expect(mock.from).not.toHaveBeenCalled();
 });
 it('clears local conversation contents when the account changes',async()=>{
   const view=renderHook(({uid})=>useMemberMessages(uid,'demo-conversation'),{initialProps:{uid:'me'}});
   await act(async()=>{await view.result.current.send('Private draft');});
   view.rerender({uid:'another-user'});
   expect(view.result.current.messages.some(m=>m.body==='Private draft')).toBe(false);
 });
});
describe('member chat interface',()=>{
 it('resumes from the plain messages route and keeps Back usable',async()=>{
   render(<MemoryRouter initialEntries={['/academy/community/messages']}><AcademyMessages/></MemoryRouter>);
   expect(await screen.findByRole('textbox',{name:'Message Avery · Demo'})).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Back to messages'}));
   await waitFor(()=>expect(screen.queryByRole('textbox',{name:'Message Avery · Demo'})).not.toBeInTheDocument());
 });
 it('opens member details with honest empty media and social links',async()=>{
   render(<MemoryRouter initialEntries={['/academy/community/messages?conversation=demo-conversation']}><AcademyMessages/></MemoryRouter>);
   fireEvent.click(await screen.findByRole('button',{name:'Member details and shared media'}));
   expect(await screen.findByText('No social links shared.')).toBeInTheDocument();
   expect(screen.getByText('No attachments yet.')).toBeInTheDocument();
   expect(screen.getByRole('link',{name:/Add Instagram or YouTube/})).toHaveAttribute('href','/academy/settings?section=profile');
   fireEvent.click(screen.getByRole('button',{name:/^Close$/}));
   await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
   expect(mock.rpc).not.toHaveBeenCalled();
 });
 it('opens the exact member from a profile without a search step',async()=>{
   const id='00000000-0000-0000-0000-000000000012';
   mock.rpc.mockResolvedValueOnce({data:[{user_id:id,display_name:'Taylor',avatar_url:null}],error:null});
   render(<MemoryRouter initialEntries={[`/academy/community/messages?member=${id}`]}><AcademyMessages/></MemoryRouter>);
   const input=await screen.findByRole('textbox',{name:'Message Taylor · Preview'});
   expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
   fireEvent.change(input,{target:{value:'Hello'}});
   expect(screen.getByRole('button',{name:'Send message'})).not.toBeDisabled();
   expect(mock.rpc).toHaveBeenCalledWith('get_community_profiles',{_user_ids:[id]},{get:true});
 });
 it('opens a conversation directly from a DM entry point without trapping Back',async()=>{
   render(<MemoryRouter initialEntries={['/academy/community/messages?resume=1']}><AcademyMessages/></MemoryRouter>);
   expect(await screen.findByRole('textbox',{name:'Message Avery · Demo'})).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Back to messages'}));
   await waitFor(()=>expect(screen.queryByRole('textbox',{name:'Message Avery · Demo'})).not.toBeInTheDocument());
   expect(screen.getByText('A little more connected.')).toBeInTheDocument();
 });
 it('sends, disables a blocked composer, and returns to conversations',async()=>{
   render(<MemoryRouter initialEntries={['/academy/community/messages?conversation=demo-conversation']}><AcademyMessages/></MemoryRouter>);
   const input=await screen.findByRole('textbox',{name:'Message Avery · Demo'});
   fireEvent.change(input,{target:{value:'Ready for class'}});fireEvent.click(screen.getByRole('button',{name:'Send message'}));
   await screen.findByText('Ready for class',{selector:'p'});expect(input).toHaveValue('');
   fireEvent.click(screen.getByRole('button',{name:'Block'}));await waitFor(()=>expect(input).toBeDisabled());
   fireEvent.click(screen.getByRole('button',{name:'Unblock'}));await waitFor(()=>expect(input).not.toBeDisabled());
   fireEvent.click(screen.getByRole('button',{name:'Back to messages'}));expect(screen.getByText('A little more connected.')).toBeInTheDocument();
 });
 it('keeps separate drafts when navigating away and back',async()=>{
   render(<MemoryRouter initialEntries={['/academy/community/messages?conversation=demo-conversation']}><AcademyMessages/></MemoryRouter>);
   fireEvent.change(await screen.findByRole('textbox',{name:'Message Avery · Demo'}),{target:{value:'Unsent question'}});
   fireEvent.click(screen.getByRole('button',{name:'Back to messages'}));
   fireEvent.click(screen.getByRole('button',{name:/Avery · Demo/}));
   expect(await screen.findByRole('textbox',{name:'Message Avery · Demo'})).toHaveValue('Unsent question');
 });
 it('shows suggested real-profile fixtures immediately, then filters and opens a conversation',async()=>{
   render(<MemoryRouter><AcademyMessages/></MemoryRouter>);
   fireEvent.click(screen.getAllByRole('button',{name:'New message'})[0]);
   expect(await screen.findByRole('button',{name:/RZ/})).toBeInTheDocument();
   fireEvent.change(screen.getByRole('textbox',{name:'Search members'}),{target:{value:'Jordan'}});
   fireEvent.click(await screen.findByRole('button',{name:/Jordan/}));
   expect(await screen.findByRole('textbox',{name:'Message Jordan'})).toBeInTheDocument();
   expect(mock.rpc).not.toHaveBeenCalled();
 });
});
