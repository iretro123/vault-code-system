import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { readFileSync } from 'node:fs';

const {members,rpc}=vi.hoisted(()=>{
 const members=[{user_id:'member-one',display_name:'Taylor',avatar_url:null},{user_id:'member-two',display_name:'Jordan',avatar_url:null}];
 return {members,rpc:vi.fn((name:string)=>Promise.resolve({data:name==='community_sidebar_summary'?{total:2,online:members}:null,error:null}))};
});
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'viewer'}})}));
vi.mock('@/lib/communitySpace',()=>({dailyVideos:()=>[],defaultSpace:()=>({rules:[],notes:'',enabled:false,morning:'09:00',afternoon:'15:00',timezone:'America/New_York',weekdays_only:true}),validateSpace:()=>null}));
vi.mock('@/lib/webPush',()=>({enableWebPush:vi.fn()}));
vi.mock('@/lib/pushPermission',()=>({isNativePushPlatform:()=>false,requestPushPermission:vi.fn()}));
vi.mock('@/components/academy/community/UserProfileCard',()=>({UserProfileCard:({userId,onClose}:{userId:string;onClose:()=>void})=><div data-testid="profile-card"><button aria-label="Close profile" onClick={onClose}>Close</button><span>{userId}</span><button>Inside action</button></div>}));
import { CommunitySpace } from '@/components/academy/community/CommunitySpace';

function RouteControl(){const navigate=useNavigate();return <button onClick={()=>navigate('/academy/live')}>Change route</button>}
const open=async(name='Taylor')=>{fireEvent.click(await screen.findByRole('button',{name:`View ${name}'s profile`}));return screen.findByTestId('profile-card')};
afterEach(()=>{cleanup();rpc.mockClear();});

it('closes with the close button, Escape, and an outside press while returning focus',async()=>{
 render(<MemoryRouter initialEntries={['/academy/community']}><CommunitySpace/></MemoryRouter>);
 await screen.findByRole('button',{name:"View Taylor's profile"});
 await open();fireEvent.click(screen.getByRole('button',{name:'Close profile'}));
 await waitFor(()=>expect(screen.queryByTestId('profile-card')).not.toBeInTheDocument());expect(screen.getByRole('button',{name:"View Taylor's profile"})).toHaveFocus();
 await open();fireEvent.keyDown(document,{key:'Escape'});
 await waitFor(()=>expect(screen.queryByTestId('profile-card')).not.toBeInTheDocument());expect(screen.getByRole('button',{name:"View Taylor's profile"})).toHaveFocus();
 await open();fireEvent.pointerDown(document.body);fireEvent.click(document.body);
 await waitFor(()=>expect(screen.queryByTestId('profile-card')).not.toBeInTheDocument());expect(screen.getByRole('button',{name:"View Taylor's profile"})).toHaveFocus();
});

it('keeps inside interactions open and switches cleanly to another member',async()=>{
 render(<MemoryRouter initialEntries={['/academy/community']}><CommunitySpace/></MemoryRouter>);
 await open();fireEvent.pointerDown(screen.getByRole('button',{name:'Inside action'}));
 expect(screen.getByTestId('profile-card')).toHaveTextContent('member-one');
 fireEvent.click(screen.getByRole('button',{name:"View Jordan's profile"}));
 await waitFor(()=>expect(screen.getByTestId('profile-card')).toHaveTextContent('member-two'));
 expect(screen.getAllByTestId('profile-card')).toHaveLength(1);
});

it('dismisses the profile when the route changes',async()=>{
 render(<MemoryRouter initialEntries={['/academy/community']}><RouteControl/><CommunitySpace/></MemoryRouter>);
 await open();fireEvent.click(screen.getByRole('button',{name:'Change route'}));
 await waitFor(()=>expect(screen.queryByTestId('profile-card')).not.toBeInTheDocument());
});

it('uses collision-aware viewport constraints and safe-area bounds',async()=>{
 render(<MemoryRouter initialEntries={['/academy/community']}><CommunitySpace/></MemoryRouter>);
 await open();const overlay=screen.getByTestId('profile-card').parentElement;
 expect(overlay).toHaveAttribute('data-side');
 const css=readFileSync('src/components/academy/community/member-profile-card.css','utf8');
 expect(css).toContain('var(--radix-popover-content-available-height');
 expect(css).toContain('env(safe-area-inset-bottom)');
 expect(css).toContain('position:fixed!important');
 expect(css).toContain('left:50%!important');
 expect(css).toContain('overflow-y:auto');
});