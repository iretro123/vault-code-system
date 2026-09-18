import { describe, expect, it, vi } from 'vitest';
// The installed app must use the same artwork even outside design-preview mode.
vi.mock('@/integrations/supabase/localPreviewFetch', () => ({ isLocalDesignPreview: () => false }));
import { localCourseCover } from '@/lib/localCourseCovers';

describe('released chapter artwork', () => {
  it('uses the custom foundations cover', () => {
    expect(localCourseCover({ slug: 'chapter-1-basic-bridge', title: 'Beginner Bridge' })).toContain('/00.png');
  });
  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('ships chapter %i outside preview mode', chapter => {
    expect(localCourseCover({ slug: `chapter-${chapter}`, title: `Chapter ${chapter} — Course` })).toContain(`/${String(chapter).padStart(2, '0')}.png`);
  });
  it('keeps the existing fallback for unrelated courses', () => {
    expect(localCourseCover({ slug: 'other', title: 'Other course' })).toBeUndefined();
  });
});
