const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

export function vaultClassCalendar(wednesday: boolean, joinUrl: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  const date = new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`);
  const startMinute = wednesday ? 1200 : 555;
  if (Number(get('hour')) * 60 + Number(get('minute')) > startMinute) date.setUTCDate(date.getUTCDate() + 1);
  while (wednesday ? date.getUTCDay() !== 3 : ![1, 2, 3, 4].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  const start = date.toISOString().slice(0, 10).replace(/-/g, '') + (wednesday ? 'T200000' : 'T091500');
  const title = wednesday ? 'Vault Wednesday Class' : 'Vault Live Trading';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vault Academy//Class Calendar//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE', 'TZID:America/New_York',
    'BEGIN:DAYLIGHT', 'DTSTART:20070311T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'DTSTART:20071104T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'TZNAME:EST', 'END:STANDARD', 'END:VTIMEZONE',
    'BEGIN:VEVENT', `UID:vault-${wednesday ? 'wednesday' : 'trading'}@member.vaulttradingacademy.com`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTSTART;TZID=America/New_York:${start}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${wednesday ? 'WE' : 'MO,TU,WE,TH'}`,
    `SUMMARY:${title}`, `DESCRIPTION:${escapeText('Join your Vault classroom. Check Vault Live for schedule changes.\n' + joinUrl)}`,
    `LOCATION:${escapeText(joinUrl)}`, 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${title} starts in 10 minutes`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  // Fold at 70 ASCII characters; configured URLs are URI-encoded before passing here.
  return lines.map(line => line.match(/.{1,70}/g)?.join('\r\n ') ?? '').join('\r\n') + '\r\n';
}

export function preferredCalendar(userAgent: string, platform = '', maxTouchPoints = 0): 'apple' | 'google' | 'choose' {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) return 'apple';
  if (/Android/i.test(userAgent)) return 'google';
  return 'choose';
}

export function classRoomUrl(wednesday: boolean) {
  return `https://member.vaulttradingacademy.com/academy/live?class=${wednesday ? 'wednesday' : 'trading'}&open=1`;
}

export function googleClassCalendarUrl(wednesday: boolean, zoomUrl?: string, now = new Date()) {
  const roomUrl = zoomUrl || classRoomUrl(wednesday);
  const calendar = vaultClassCalendar(wednesday, roomUrl, now).replace(/\r\n /g, '');
  const start = calendar.match(/DTSTART;TZID=America\/New_York:(\d{8}T\d{6})/)![1];
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: wednesday ? 'Vault Wednesday Class' : 'Vault Live Trading',
    // Start-only reminder, not an invented class duration. User can edit before saving.
    dates: `${start}/${start}`, ctz: 'America/New_York',
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${wednesday ? 'WE' : 'MO,TU,WE,TH'}`,
    details: `Join your Vault classroom. Check Vault Live for schedule changes.\n${roomUrl}`, location: roomUrl,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
