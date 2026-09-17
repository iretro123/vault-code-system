import { afterEach, describe, expect, it, vi } from 'vitest';
import { localPreviewFetch } from '@/integrations/supabase/localPreviewFetch';
import { getVideoEmbedUrl, getYouTubeId } from '@/lib/videoEmbeds';

afterEach(() => vi.unstubAllGlobals());

describe('Learn preview backend safety', () => {
  it.each([
    ['/rest/v1/playbook_progress', 'POST'],
    ['/rest/v1/lesson_progress', 'PATCH'],
    ['/storage/v1/object/playbook/vault-playbook.pdf', 'DELETE'],
    ['/functions/v1/send-notification', 'POST'],
    ['/rest/v1/rpc/anything', 'POST'],
  ])('blocks live mutation %s', async (path, method) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const response = await localPreviewFetch(`https://example.supabase.co${path}`, {method});
    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows only the audited PDF retrieval action', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({status: 200});
    vi.stubGlobal('fetch', fetchSpy);
    await localPreviewFetch('https://example.supabase.co/functions/v1/playbook-signed-url', {method: 'POST'});
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe('Lesson video destinations', () => {
  it('supports the real setup walkthrough URL', () => {
    expect(getYouTubeId('https://youtu.be/QqSeDPpJY0Q?feature=shared')).toBe('QqSeDPpJY0Q');
    expect(getVideoEmbedUrl('https://youtu.be/QqSeDPpJY0Q')).toContain('youtube-nocookie.com/embed/QqSeDPpJY0Q');
  });
  it('does not embed an empty video destination', () => {
    expect(getVideoEmbedUrl('')).toBeNull();
  });
});
