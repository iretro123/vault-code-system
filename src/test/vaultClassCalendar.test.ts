import { expect, it } from 'vitest';
import { vaultClassCalendar, preferredCalendar, googleClassCalendarUrl } from '@/lib/vaultClassCalendar';
const unfolded = (text:string) => text.replace(/\r\n /g,'');
it('creates the Monday–Thursday 9:15 Eastern series, skipping Friday',()=>{
  const text=unfolded(vaultClassCalendar(false,'https://example.com/room',new Date('2026-09-18T12:00:00Z')));
  expect(text).toContain('DTSTART;TZID=America/New_York:20260921T091500');
  expect(text).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH');
  expect(text).toContain('LOCATION:https://example.com/room');
});
it('creates Wednesday at 8pm with daylight-saving rules',()=>{
  const text=unfolded(vaultClassCalendar(true,'https://example.com/class',new Date('2026-09-15T12:00:00Z')));
  expect(text).toContain('DTSTART;TZID=America/New_York:20260916T200000');
  expect(text).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE');
  expect(text).toContain('TZOFFSETTO:-0400');expect(text).toContain('TZOFFSETTO:-0500');
});
it('moves to next Wednesday after class starts',()=>{
  expect(vaultClassCalendar(true,'https://example.com',new Date('2026-09-17T01:00:00Z'))).toContain('20260923T200000');
});
it('routes by device rather than browser brand',()=>{
  expect(preferredCalendar('Mozilla iPhone CriOS/123')).toBe('apple');
  expect(preferredCalendar('Mozilla iPhone Safari/604')).toBe('apple');
  expect(preferredCalendar('Mozilla Macintosh Safari','MacIntel',5)).toBe('apple');
  expect(preferredCalendar('Mozilla Android Chrome/123')).toBe('google');
  expect(preferredCalendar('Mozilla Windows Chrome/123')).toBe('choose');
  expect(preferredCalendar('Mozilla Macintosh Safari','MacIntel',0)).toBe('choose');
});
it('prefills Google with correct recurring class and Eastern timezone',()=>{
  const link=new URL(googleClassCalendarUrl(true,'https://example.com/zoom?pwd=a%2Bb',new Date('2026-09-15T12:00:00Z')));
  expect(link.hostname).toBe('calendar.google.com');
  expect(link.searchParams.get('dates')).toBe('20260916T200000/20260916T200000');
  expect(link.searchParams.get('ctz')).toBe('America/New_York');
  expect(link.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY;BYDAY=WE');
  expect(link.searchParams.get('location')).toBe('https://example.com/zoom?pwd=a%2Bb');
});
