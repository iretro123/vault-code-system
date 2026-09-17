import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
const mock=vi.hoisted(()=>({uid:'other',profile:{user_id:'member',display_name:'Taylor',username:'taylor',avatar_url:null,banner_url:null,bio:'Learning together',created_at:'2026-01-01',social_instagram:'@taylor',social_youtube:'https://www.youtube.com/@taylor',lessons_completed:3,role_level:'Beginner'}}));
vi.mock('@/hooks/usePublicProfile',()=>({usePublicProfile:()=>({profile:mock.profile,loading:false,refetch:vi.fn()})}));
vi.mock('@/hooks/useUserPresence',()=>({useUserPresence:()=>({online:false})}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:mock.uid}})}));
vi.mock('@/integrations/supabase/localPreviewFetch',()=>({isLocalDesignPreview:()=>true}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import {UserProfileCard} from '@/components/academy/community/UserProfileCard';
function Location(){return <output>{useLocation().pathname+useLocation().search}</output>}
afterEach(()=>{cleanup();sessionStorage.clear();mock.uid='other';});
it('shows handles, real milestone progress and routes straight to the selected member',()=>{
 const close=vi.fn();render(<MemoryRouter><UserProfileCard userId="member" onClose={close}/><Location/></MemoryRouter>);
 expect(screen.getByTitle('Instagram')).toHaveAttribute('href','https://instagram.com/taylor');
 expect(screen.getByTitle('YouTube')).toHaveAttribute('href','https://www.youtube.com/@taylor');
 expect(screen.getByRole('progressbar')).toHaveAttribute('value','3');
 fireEvent.click(screen.getByRole('button',{name:'Message'}));
 expect(screen.getByText('/academy/community/messages?member=member')).toBeInTheDocument();expect(close).toHaveBeenCalled();
});
it('previews own saved links and directs editing to the one settings page',()=>{
 mock.uid='member';sessionStorage.setItem('vault-profile-draft:member',JSON.stringify({instagram:'@localhandle',bio:'Local biography'}));
 render(<MemoryRouter><UserProfileCard userId="member" onClose={()=>{}}/><Location/></MemoryRouter>);
 expect(screen.getByText('Local biography')).toBeInTheDocument();expect(screen.getByTitle('Instagram')).toHaveAttribute('href','https://instagram.com/localhandle');
 expect(screen.queryByRole('button',{name:'Message'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/^Edit profile$/}));
 expect(screen.getByText('/academy/settings?section=profile')).toBeInTheDocument();
});
