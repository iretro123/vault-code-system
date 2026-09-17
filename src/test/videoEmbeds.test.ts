import {describe,it,expect,vi,afterEach} from 'vitest';
import {getYouTubeId,getVideoEmbedUrl,getVideoPageOrigin} from '@/lib/videoEmbeds';
afterEach(()=>vi.unstubAllGlobals());
describe('lesson video URLs',()=>{
 it.each(['https://member.vaulttradingacademy.com','https://preview.lovable.app','http://127.0.0.1:4175'])('uses the actual web origin on %s',origin=>{
  vi.stubGlobal('window',{location:new URL(origin)});
  expect(new URL(getVideoEmbedUrl('https://youtu.be/abcdefghijk')!).searchParams.get('origin')).toBe(origin);
 });
 it('keeps the HTTPS relay for native playback',()=>{
  vi.stubGlobal('window',{location:new URL('capacitor://localhost')});
  expect(getVideoEmbedUrl('https://youtu.be/abcdefghijk')).toBe('https://member.vaulttradingacademy.com/youtube-embed?video=abcdefghijk');
  expect(getVideoPageOrigin()).toBe('https://member.vaulttradingacademy.com');
 });
 it.each(['https://youtu.be/abcdefghijk','https://youtube.com/watch?t=1&v=abcdefghijk','https://youtube.com/live/abcdefghijk','https://www.youtube-nocookie.com/embed/abcdefghijk','https://m.youtube.com/shorts/abcdefghijk'])('recognizes %s',url=>expect(getYouTubeId(url)).toBe('abcdefghijk'));
 it('does not accept lookalike hosts or unsafe embeds',()=>{
  expect(getYouTubeId('https://notyoutube.com/watch?v=abcdefghijk')).toBeNull();
  expect(getVideoEmbedUrl('javascript:alert(1)//embed')).toBeNull();
 });
 it('preserves private Vimeo access hashes',()=>{
  expect(getVideoEmbedUrl('https://vimeo.com/123456/abcdef')).toBe('https://player.vimeo.com/video/123456?h=abcdef');
  expect(getVideoEmbedUrl('https://player.vimeo.com/video/123456?h=abcdef')).toBe('https://player.vimeo.com/video/123456?h=abcdef');
 });
 it('handles Loom embeds',()=>expect(getVideoEmbedUrl('https://www.loom.com/share/abc123')).toBe('https://www.loom.com/embed/abc123'));
});
