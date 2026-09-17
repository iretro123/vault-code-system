import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AddClassCalendar } from '@/components/academy/live/AddClassCalendar';
afterEach(cleanup);
it.each([false,true])('links straight to Google for class %s with the requested label',wednesday=>{
  render(<AddClassCalendar wednesday={wednesday}/>);
  const link=screen.getByRole('link',{name:'Add to calendar'});
  const url=new URL(link.getAttribute('href')!);
  expect(url.hostname).toBe('calendar.google.com');
  expect(url.searchParams.get('recur')).toBe(wednesday?'RRULE:FREQ=WEEKLY;BYDAY=WE':'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH');
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText(/Apple/)).toBeNull();
});
