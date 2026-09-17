import {describe,it,expect} from 'vitest';
import {socialProfileUrl} from '@/lib/memberSocialLinks';
describe('member social links',()=>{
 it('builds platform links from handles',()=>{
   expect(socialProfileUrl('@vault','instagram')).toBe('https://instagram.com/vault');
   expect(socialProfileUrl('@vault','youtube')).toBe('https://youtube.com/@vault');
 });
 it('accepts https links only on the correct platform',()=>{
   expect(socialProfileUrl('https://www.youtube.com/@vault','youtube')).toBe('https://www.youtube.com/@vault');
   for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/a','http://youtube.com/a','https://a@youtube.com/a','https://instagram.com/a']) expect(socialProfileUrl(url,'youtube')).toBeNull();
 });
});
