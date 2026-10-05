import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {readFileSync} from 'node:fs';
const mock=vi.hoisted(()=>({uid:'other',loading:false,profile:{user_id:'member',display_name:'Taylor',username:'taylor',avatar_url:null,banner_url:null,bio:'Learning together',created_at:'2026-01-01',social_instagram:'@taylor',social_youtube:'https://www.youtube.com/@taylor',lessons_completed:3,role_level:'Beginner'} as Record<string,unknown>|null}));
vi.mock('@/hooks/usePublicProfile',()=>({usePublicProfile:()=>({profile:mock.profile,loading:mock.loading,refetch:vi.fn()})}));
vi.mock('@/hooks/useUserPresence',()=>({useUserPresence:()=>({online:false})}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:mock.uid}})}));
vi.mock('@/integrations/supabase/localPreviewFetch',()=>({isLocalDesignPreview:()=>true}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import {UserProfileCard} from '@/components/academy/community/UserProfileCard';
function Location(){return <output>{useLocation().pathname+useLocation().search}</output>}
afterEach(()=>{cleanup();sessionStorage.clear();mock.uid='other';mock.loading=false;mock.profile={user_id:'member',display_name:'Taylor',username:'taylor',avatar_url:null,banner_url:null,bio:'Learning together',created_at:'2026-01-01',social_instagram:'@taylor',social_youtube:'https://www.youtube.com/@taylor',lessons_completed:3,role_level:'Beginner'};});
it('shows handles, real milestone progress and routes straight to the selected member',()=>{
 const close=vi.fn();render(<MemoryRouter><UserProfileCard userId="member" onClose={close}/><Location/></MemoryRouter>);
 expect(screen.getByTitle('Instagram')).toHaveAttribute('href','https://instagram.com/taylor');
 expect(screen.getByTitle('YouTube')).toHaveAttribute('href','https://www.youtube.com/@taylor');
 expect(screen.getByRole('progressbar')).toHaveAttribute('value','3');
 fireEvent.click(screen.getByRole('button',{name:'Message'}));
 expect(screen.getByText('/academy/community/messages?member=member')).toBeInTheDocument();expect(close).toHaveBeenCalled();
});
it('always provides an accessible close action while loaded, loading, or unavailable',()=>{
 const close=vi.fn();const view=render(<MemoryRouter><UserProfileCard userId="member" onClose={close}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Close profile'}));expect(close).toHaveBeenCalledTimes(1);
 mock.loading=true;view.rerender(<MemoryRouter><UserProfileCard userId="member" onClose={close}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Close profile'}));expect(close).toHaveBeenCalledTimes(2);
 mock.loading=false;mock.profile=null;view.rerender(<MemoryRouter><UserProfileCard userId="member" onClose={close}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Close profile'}));expect(close).toHaveBeenCalledTimes(3);
});
it('keeps the close action pinned when a long profile body scrolls',()=>{
 const close=vi.fn();mock.profile={...mock.profile,bio:'Long profile '.repeat(80)};
 render(<MemoryRouter><UserProfileCard userId="member" onClose={close}/></MemoryRouter>);
 const button=screen.getByRole('button',{name:'Close profile'});
 const shell=button.closest('.member-profile-shell');
 expect(shell).not.toBeNull();
 const css=readFileSync('src/components/academy/community/member-profile-card.css','utf8');
 expect(css).toMatch(/\.member-profile-close\{position:sticky/);
 expect(css).toContain('top:max(8px,env(safe-area-inset-top))');
 fireEvent.scroll(shell as Element,{target:{scrollTop:400}});
 fireEvent.click(button);expect(close).toHaveBeenCalledOnce();
});
it('previews own saved links and directs editing to the one settings page',()=>{
 mock.uid='member';sessionStorage.setItem('vault-profile-draft:member',JSON.stringify({instagram:'@localhandle',bio:'Local biography'}));
 render(<MemoryRouter><UserProfileCard userId="member" onClose={()=>{}}/><Location/></MemoryRouter>);
 expect(screen.getByText('Local biography')).toBeInTheDocument();expect(screen.getByTitle('Instagram')).toHaveAttribute('href','https://instagram.com/localhandle');
 expect(screen.queryByRole('button',{name:'Message'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/^Edit profile$/}));
 expect(screen.getByText('/academy/settings?section=profile')).toBeInTheDocument();
});
