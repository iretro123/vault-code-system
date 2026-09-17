import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import AtlasVisualLesson,{makeLessonCandles,lessonZone,isDemandMark} from '../components/academy/atlas/AtlasVisualLesson';

beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{cleanup();vi.useRealTimers();});
const tick=(count:number)=>{for(let i=0;i<count;i++)act(()=>{vi.advanceTimersByTime(900);});};
const playToMark=()=>{fireEvent.click(screen.getByRole('button',{name:'Play the lesson'}));tick(5);};
const complete=()=>{playToMark();fireEvent.click(screen.getByRole('button',{name:'Show me why'}));fireEvent.click(screen.getByRole('button',{name:'Watch the return'}));tick(6);fireEvent.click(screen.getByRole('button',{name:'Reveal the response'}));tick(6);};

describe('Atlas chart practice',()=>{
  it('anchors the zone to the actual base and uses identical beginnings for both outcomes',()=>{
    const bounce=makeLessonCandles('bounce'),failure=makeLessonCandles('failure');
    expect(bounce.slice(0,18)).toEqual(failure.slice(0,18));
    expect(Math.min(...bounce.slice(3,7).map(c=>c.low))).toBeCloseTo(lessonZone.low);
    expect(Math.max(...bounce.slice(3,7).map(c=>c.high))).toBeCloseTo(lessonZone.high);
    expect(isDemandMark(9,105)).toBe(false);
    expect(bounce[18].close).toBeGreaterThan(bounce[17].open);
    expect(failure[18].close).toBeLessThan(lessonZone.low);
  });
  it('reveals candles without lookahead, pauses for a mark, and gives corrective feedback',()=>{
    render(<AtlasVisualLesson/>);
    expect(screen.getAllByTestId('lesson-candle')).toHaveLength(7);
    playToMark();tick(10);
    expect(screen.getAllByTestId('lesson-candle')).toHaveLength(12);
    expect(screen.queryByTestId('marked-demand-zone')).toBeNull();
    const chart=screen.getByRole('slider');
    fireEvent.keyDown(chart,{key:'End'});fireEvent.keyDown(chart,{key:'Enter'});
    expect(screen.getByText(/You marked the move away/)).toBeTruthy();
    fireEvent.keyDown(chart,{key:'Home'});
    for(let i=0;i<4;i++)fireEvent.keyDown(chart,{key:'ArrowRight'});
    fireEvent.keyDown(chart,{key:'Enter'});
    expect(screen.getByTestId('marked-demand-zone')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Watch the return'}));tick(6);tick(10);
    expect(screen.getAllByTestId('lesson-candle')).toHaveLength(18);
    expect(screen.getByText('A touch is not confirmation.')).toBeTruthy();
  });
  it('supports pause, replay, and comparison with a failed zone',()=>{
    render(<AtlasVisualLesson/>);
    fireEvent.click(screen.getByRole('button',{name:'Play the lesson'}));tick(1);
    fireEvent.click(screen.getByRole('button',{name:'Pause'}));tick(5);
    expect(screen.getAllByTestId('lesson-candle')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button',{name:'Restart chart lesson'}));
    complete();expect(screen.getAllByTestId('lesson-candle')).toHaveLength(24);
    fireEvent.click(screen.getByRole('button',{name:'Compare a failure'}));
    expect(screen.getAllByTestId('lesson-candle')).toHaveLength(7);
    complete();expect(screen.getByText('Same beginning. Different outcome.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Replay lesson'}));
    expect(screen.queryByTestId('marked-demand-zone')).toBeNull();
  });
  it('stops when the mentor closes',()=>{
    const {rerender}=render(<AtlasVisualLesson active/>);
    fireEvent.click(screen.getByRole('button',{name:'Play the lesson'}));tick(1);
    rerender(<AtlasVisualLesson active={false}/>);tick(10);
    expect(screen.getAllByTestId('lesson-candle')).toHaveLength(8);
  });
  it('respects reduced motion with manual candle steps',()=>{
    const original=window.matchMedia;
    window.matchMedia=vi.fn().mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()});
    try{
      render(<AtlasVisualLesson/>);
      fireEvent.click(screen.getByRole('button',{name:'Play the lesson'}));tick(10);
      expect(screen.getAllByTestId('lesson-candle')).toHaveLength(7);
      fireEvent.click(screen.getByRole('button',{name:'Next candle'}));
      expect(screen.getAllByTestId('lesson-candle')).toHaveLength(8);
    }finally{window.matchMedia=original;}
  });
});
