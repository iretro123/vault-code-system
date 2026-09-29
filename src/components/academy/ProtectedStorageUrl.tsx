import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { protectedStorageObject, resolveProtectedStorageUrl, safeMediaUrl } from '@/lib/protectedStorage';

type Props = { url: string; children: (url: string) => ReactNode };
/** Short-lived, account-scoped URLs. Never persist tokens in chat or localStorage. */
export function ProtectedStorageUrl(props: Props) {
  if (!protectedStorageObject(props.url)) return <>{props.children(safeMediaUrl(props.url))}</>;
  return <SignedStorageUrl {...props} />;
}
function SignedStorageUrl({ url, children }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState({ key: '', url: '', error: false });
  const key = `${userId ?? ''}:${url}`;
  useEffect(() => {
    let alive = true;
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      if (!userId) { setState({ key, url: '', error: true }); return; }
      try {
        const signed = await resolveProtectedStorageUrl(url);
        if (alive && current === request) setState({ key, url: signed, error: false });
      } catch { if (alive && current === request) setState({ key, url: '', error: true }); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 240_000);
    const resume = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', refresh);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', refresh); };
  }, [key, url, userId]);
  if (state.key !== key || !state.url) return <span className="text-xs text-muted-foreground" role="status">{state.key === key && state.error ? 'File unavailable. Check your access or reconnect.' : 'Loading attachment…'}</span>;
  return <>{children(state.url)}</>;
}
