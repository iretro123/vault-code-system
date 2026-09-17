import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isLocalDesignPreview } from '@/integrations/supabase/localPreviewFetch';

interface TypingUser { userId: string; userName: string }

export function useTypingIndicator(roomSlug: string, userId?: string, userName?: string, active = true) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ready = useRef(false);
  const lastBroadcast = useRef(0);
  const isTyping = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const stopTyping = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (isTyping.current && ready.current && channelRef.current && !isLocalDesignPreview()) {
      void channelRef.current.send({type:'broadcast',event:'typing',payload:{userId,userName,typing:false}}).catch(()=>{});
    }
    isTyping.current = false;
    lastBroadcast.current = 0;
  }, [userId,userName]);

  useEffect(() => {
    setTypingUsers([]);
    if (!active || !userId || !roomSlug || roomSlug === '__deferred__') return;
    let disposed = false;
    const expiry = new Map<string,ReturnType<typeof setTimeout>>();
    const channel = supabase.channel(`typing-${roomSlug}`, {config:{private:true,broadcast:{self:false}}});
    channelRef.current = channel;
    channel.on('broadcast',{event:'typing'},({payload})=>{
      if (disposed || !payload || typeof payload.userId !== 'string' || typeof payload.userName !== 'string' || payload.userId === userId) return;
      const uid=payload.userId, name=payload.userName.trim().slice(0,60);
      if (!name) return;
      clearTimeout(expiry.get(uid));
      const remove=()=>{expiry.delete(uid);if(!disposed)setTypingUsers(prev=>prev.filter(person=>person.userId!==uid));};
      if(payload.typing === false){remove();return;}
      // Refresh one timer per person, rather than letting older timers hide new activity.
      setTypingUsers(prev=>[...prev.filter(person=>person.userId!==uid),{userId:uid,userName:name}].slice(-8));
      expiry.set(uid,setTimeout(remove,3500));
    }).subscribe(status=>{ready.current=status==='SUBSCRIBED';});
    const onVisibility=()=>{if(document.visibilityState!=='visible')stopTyping();};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{
      stopTyping();disposed=true;ready.current=false;
      expiry.forEach(clearTimeout);expiry.clear();
      document.removeEventListener('visibilitychange',onVisibility);
      void supabase.removeChannel(channel);channelRef.current=null;
    };
  },[roomSlug,userId,active,stopTyping]);

  const broadcastTyping=useCallback(()=>{
    if(!active || !userId || !userName || !ready.current || !channelRef.current || isLocalDesignPreview())return;
    clearTimeout(idleTimer.current);
    idleTimer.current=setTimeout(stopTyping,1800);
    const now=Date.now();
    if(isTyping.current && now-lastBroadcast.current<1000)return;
    isTyping.current=true;lastBroadcast.current=now;
    void channelRef.current.send({type:'broadcast',event:'typing',payload:{userId,userName,typing:true}}).catch(()=>{});
  },[active,userId,userName,stopTyping]);

  const typingText=typingUsers.length===0?null:typingUsers.length===1?`${typingUsers[0].userName.split(/\s+/)[0]} is typing`:
    typingUsers.length===2?`${typingUsers[0].userName.split(/\s+/)[0]} and ${typingUsers[1].userName.split(/\s+/)[0]} are typing`:'Several people are typing';
  return {typingText,broadcastTyping,stopTyping};
}
