import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ChatAvatar } from '@/lib/chatAvatars';
import { MemberMedia } from './MemberMedia';
import type { Member, MemberMessage } from '@/hooks/useMemberMessages';

import { socialProfileUrl } from '@/lib/memberSocialLinks';

export function MemberDetails({ member, messages, open, onClose }: { member: Member; messages: MemberMessage[]; open: boolean; onClose: () => void }) {
  const [details, setDetails] = useState<{bio?: string; social_instagram?: string; social_youtube?: string} | null>(null);
  const [state, setState] = useState('');
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setDetails(null);
    if (!/^[0-9a-f-]{36}$/i.test(member.user_id)) { setState('This is a demo profile.'); return; }
    setState('Loading profile…');
    supabase.rpc('get_community_profiles', { _user_ids: [member.user_id] }, { get: true }).then(({ data, error }) => {
      if (!alive) return;
      setDetails(data?.[0] ?? null);
      setState(error || !data?.length ? 'Profile unavailable right now.' : '');
    }, () => { if (alive) setState('Profile unavailable right now.'); });
    return () => { alive = false; };
  }, [open, member.user_id]);
  const instagram = socialProfileUrl(details?.social_instagram, 'instagram');
  const youtube = socialProfileUrl(details?.social_youtube, 'youtube');
  const attachments = messages.flatMap(m => (m.attachments || []).map((attachment, i) => ({ key: `${m.id}-${i}`, attachment })));
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="vm-member-details">
      <ChatAvatar userName={member.display_name} avatarUrl={member.avatar_url} size="h-16 w-16"/>
      <DialogTitle>{member.display_name}</DialogTitle>
      <DialogDescription>{member.username ? `@${member.username}` : 'Member details & shared media'}</DialogDescription>
      {state && <p role="status">{state}</p>}
      {details?.bio && <p className="vm-member-bio">{details.bio}</p>}
      <h3>Find them elsewhere</h3>
      <div className="vm-social-links">
        {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18}/> Instagram <ExternalLink size={14}/></a>}
        {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer"><Youtube size={18}/> YouTube <ExternalLink size={14}/></a>}
      </div>
      {!instagram && !youtube && <p>No social links shared.</p>}
      <h3>Shared media</h3>
      <p>From messages loaded in this conversation.</p>
      {attachments.length ? <div className="vm-shared-media">{attachments.map(item => <MemberMedia key={item.key} attachment={item.attachment}/>)}</div> : <p>No attachments yet.</p>}
      <Link className="vm-own-social" to="/academy/settings?section=profile">Add Instagram or YouTube to your profile <ExternalLink size={14}/></Link>
    </DialogContent>
  </Dialog>;
}
