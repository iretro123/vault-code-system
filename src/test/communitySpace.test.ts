import {describe,it,expect} from 'vitest';
import {dailyVideos,defaultSpace,validateSpace} from '@/lib/communitySpace';
describe('daily RZ picks',()=>{
 it('stays stable through the NY day and changes at midnight',()=>{
 expect(dailyVideos(new Date('2026-09-30T04:00:00Z'))).toEqual(dailyVideos(new Date('2026-10-01T03:59:00Z')));
 expect(dailyVideos(new Date('2026-10-01T04:00:00Z'))).not.toEqual(dailyVideos(new Date('2026-09-30T04:00:00Z')));
 });
 it('returns two unique public video IDs',()=>{const v=dailyVideos();expect(new Set(v.map(x=>x.id)).size).toBe(2);});
});
describe('private reminder settings',()=>{
 it('starts opted out',()=>expect(defaultSpace().enabled).toBe(false));
 it('requires content before enabling',()=>expect(validateSpace({...defaultSpace(),enabled:true})).not.toBeNull());
 it('accepts personal rules',()=>expect(validateSpace({...defaultSpace(),enabled:true,rules:['Follow my plan']})).toBeNull());
 it('rejects invalid zones and reversed slots',()=>{
 expect(validateSpace({...defaultSpace(),timezone:'not-a-zone'})).not.toBeNull();
 expect(validateSpace({...defaultSpace(),morning:'14:00'})).not.toBeNull();
 expect(validateSpace({...defaultSpace(),afternoon:'10:00'})).not.toBeNull();
 });
 it('bounds private content',()=>expect(validateSpace({...defaultSpace(),notes:'x'.repeat(2001)})).not.toBeNull());
});
