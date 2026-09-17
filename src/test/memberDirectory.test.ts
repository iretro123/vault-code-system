import {expect,it} from 'vitest';
import {rankDirectoryMembers} from '@/lib/memberDirectory';
const profiles=[{user_id:'rz',display_name:'RZ',avatar_url:null,is_rz:true},{user_id:'a',display_name:'Alex',username:'alex123',avatar_url:null},{user_id:'b',display_name:'Blair',avatar_url:null},{user_id:'fake',display_name:'RZ',avatar_url:null}];
it('pins verified RZ, then ranks by recent post counts',()=>{
 expect(rankDirectoryMembers(profiles,[{user_id:'a'},{user_id:'b'},{user_id:'b'}],'viewer').map(p=>p.user_id)).toEqual(['rz','b','a','fake']);
});
it('keeps the RZ self row but excludes other self accounts',()=>{
 expect(rankDirectoryMembers(profiles,[],'rz')[0].user_id).toBe('rz');
 expect(rankDirectoryMembers(profiles,[],'a').some(p=>p.user_id==='a')).toBe(false);
});
it('searches names and usernames without inventing members',()=>{
 expect(rankDirectoryMembers(profiles,[],'viewer','alex123').map(p=>p.user_id)).toEqual(['a']);
 expect(rankDirectoryMembers(profiles,[],'viewer','Avery')).toEqual([]);
});
