import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import AtlasExample from '../components/academy/atlas/AtlasExample';
import {createScenario,VisualTopic} from '../components/academy/atlas/atlasScenarios';
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{cleanup();vi.useRealTimers();});
const finish=()=>{for(let i=0;i<12;i++)act(()=>{vi.advanceTimersByTime(600);});};

describe('Atlas varied examples',()=>{
  it('provides six distinct scenarios with valid candles at different scales',()=>{
    const ids=new Set<string>();
    for(const topic of ['demand','structure','confirmation'] as VisualTopic[]){
      for(let serial=0;serial<60;serial++){
        const s=createScenario(topic,serial);ids.add(s.id);
        for(const c of s.candles){expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open,c.close));expect(c.low).toBeLessThanOrEqual(Math.min(c.open,c.close));}
        if(s.base){expect(s.base.high).toBe(Math.max(...s.candles.slice(s.base.first,s.base.last+1).map(c=>c.high)));expect(s.base.low).toBe(Math.min(...s.candles.slice(s.base.first,s.base.last+1).map(c=>c.low)));}
        if(s.swing!==undefined){expect(s.breakIndex).toBeGreaterThan(s.swing);const c=s.candles[s.breakIndex!];expect(s.mirror?c.close<s.level!:c.close>s.level!).toBe(true);}
      }
    }
    expect(ids.size).toBe(6);
    expect(createScenario('demand',2).candles).not.toEqual(createScenario('demand',0).candles);
  });
  it('uses different directional structure and correctly defined confirmation closes',()=>{
    const bullish=createScenario('structure',0),bearish=createScenario('structure',1);
    expect(bullish.candles.at(-1)!.close).toBeGreaterThan(bullish.candles[0].close);
    expect(bearish.candles.at(-1)!.close).toBeLessThan(bearish.candles[0].close);
    const bounce=createScenario('confirmation',0),failure=createScenario('confirmation',1);
    expect(bounce.candles[17].close).toBeGreaterThan(bounce.candles[16].open);
    expect(failure.candles[17].close).toBeLessThan(failure.base!.low);
  });
  it('shows one action, reveals context with new candles, and generates a different example',()=>{
    render(<AtlasExample topic="demand"/>);
    const title=screen.getByRole('heading').textContent;
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getAllByTestId('example-candle')).toHaveLength(15);
    expect(screen.queryByTestId('example-zone')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Show me what matters'}));
    expect(screen.getByTestId('example-zone')).toBeTruthy();
    finish();fireEvent.click(screen.getByRole('button',{name:'Another example'}));
    expect(screen.getByRole('heading').textContent).not.toBe(title);
    expect(screen.getAllByTestId('example-candle')).toHaveLength(15);
    expect(screen.queryByTestId('example-zone')).toBeNull();
  });
  it('pauses when closed and changes the visual by topic',()=>{
    const {rerender}=render(<AtlasExample topic="structure" active/>);
    fireEvent.click(screen.getByRole('button',{name:'Show me what matters'}));
    expect(screen.getByTestId('example-swing')).toBeTruthy();
    rerender(<AtlasExample topic="structure" active={false}/>);finish();
    expect(screen.getAllByTestId('example-candle')).toHaveLength(15);
    rerender(<AtlasExample topic="confirmation" active/>);
    expect(screen.queryByTestId('example-swing')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Show me what matters'}));finish();
    expect(screen.getByTestId('example-response')).toBeTruthy();
  });
});
