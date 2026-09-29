import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
export function useClassroomLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let cancelled=false;
    setLinks({});setLoading(!!user);
    if (!user) return;
    void supabase.from('vault_classroom_links' as never).select('classroom,join_url').then(({data,error})=>{
      if(cancelled)return;
      if(!error&&data) setLinks(Object.fromEntries((data as unknown as {classroom:string;join_url:string}[]).filter(row=>{
        try { const url=new URL(row.join_url);return url.protocol==='https:'&&!url.username&&!url.password; } catch {return false;}
      }).map(row=>[row.classroom,row.join_url])));
      setLoading(false);
    });
    return()=>{cancelled=true;};
  },[user?.id]);
  return {links,loading};
}
