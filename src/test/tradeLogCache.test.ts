import {afterEach,expect,it,vi} from 'vitest';
import {clearTradeLogCache} from '@/lib/tradeLogCache';
afterEach(()=>{localStorage.clear();vi.restoreAllMocks();});
function seed(){for(const key of ['va_cache_trade_entries','va_cache_trade_entries_ts','va_cache_trade_entries:a','va_cache_trade_entries:b','unrelated'])localStorage.setItem(key,'saved');}
it('removes every trade cache on sign-out without deleting unrelated storage',()=>{
 seed();clearTradeLogCache();expect(localStorage.length).toBe(1);expect(localStorage.getItem('unrelated')).toBe('saved');
});
it('removes resetting user and unsafe legacy cache but preserves another user cache',()=>{
 seed();clearTradeLogCache('a');expect(localStorage.getItem('va_cache_trade_entries:a')).toBeNull();expect(localStorage.getItem('va_cache_trade_entries')).toBeNull();expect(localStorage.getItem('va_cache_trade_entries_ts')).toBeNull();expect(localStorage.getItem('va_cache_trade_entries:b')).toBe('saved');
});
it('does not prevent sign-out if browser storage is inaccessible',()=>{
 vi.spyOn(Storage.prototype,'key').mockImplementation(()=>{throw new Error('denied');});seed();expect(()=>clearTradeLogCache()).not.toThrow();
});
