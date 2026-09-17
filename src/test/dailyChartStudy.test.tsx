import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import DailyChartStudy from '../design-studio/DailyStudyCard';
import {dailyChartStudy,studyDay} from '../design-studio/dailyStudyEngine';
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('Daily dashboard study',()=>{
  it('uses Eastern dates including daylight saving transitions',()=>{
    expect(studyDay(new Date('2026-09-12T03:59:59Z'))).toBe('2026-09-11');
    expect(studyDay(new Date('2026-09-12T04:00:00Z'))).toBe('2026-09-12');
    expect(studyDay(new Date('2026-12-12T04:59:59Z'))).toBe('2026-12-11');
    expect(studyDay(new Date('2026-12-12T05:00:00Z'))).toBe('2026-12-12');
    expect(studyDay(new Date('2026-03-08T07:00:00Z'))).toBe('2026-03-08');
  });
  it('stays consistent per day and rotates through ten distinct studies',()=>{
    const lessons=Array.from({length:30},(_,i)=>dailyChartStudy(new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10)));
    expect(new Set(lessons.slice(0,10).map(s=>s.question)).size).toBe(9);
    expect(new Set(lessons.slice(0,10).map(s=>s.slot)).size).toBe(10);
    expect(new Set(lessons.map(s=>JSON.stringify(s.candles))).size).toBe(30);
    expect(dailyChartStudy('2026-09-11')).toEqual(dailyChartStudy('2026-09-11'));
    for(const s of lessons){
      for(const c of s.candles){expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open,c.close));expect(c.low).toBeLessThanOrEqual(Math.min(c.open,c.close));}
      for(const m of s.marks){expect(m.high).toBeGreaterThanOrEqual(m.low);expect(m.first).toBeLessThanOrEqual(m.last);expect(m.last).toBeLessThan(s.candles.length);}
      if(s.slot===6){expect(s.marks[0].low).toBeCloseTo(s.candles[4].high);expect(s.marks[0].high).toBeCloseTo(s.candles[6].low);}
      if(s.slot===7){expect(s.marks[0].low).toBeCloseTo(s.candles[6].high);expect(s.marks[0].high).toBeCloseTo(s.candles[4].low);}
      if(s.slot===4){expect(s.candles[11].high).toBeGreaterThan(s.marks[0].high);expect(s.candles[11].close).toBeLessThan(s.marks[0].high);}
      if(s.slot===5){expect(s.candles[11].low).toBeLessThan(s.marks[0].low);expect(s.candles[11].close).toBeGreaterThan(s.marks[0].low);}
    }
  });
  it('updates an open dashboard at midnight and clears the prior reveal',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-12T03:59:59Z'));
    const {container}=render(<DailyChartStudy/>);
    const previous=container.firstElementChild!.getAttribute('data-study-id');
    fireEvent.click(screen.getByRole('button',{name:'Show me the answer'}));
    expect(screen.getByTestId('daily-study-mark')).toBeTruthy();
    act(()=>{vi.advanceTimersByTime(1000);});
    expect(container.firstElementChild!.getAttribute('data-study-id')).not.toBe(previous);
    expect(screen.queryByTestId('daily-study-mark')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
