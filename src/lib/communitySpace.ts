export interface SpaceSettings { rules: string[]; notes: string; enabled: boolean; weekdays_only: boolean; timezone: string; morning: string; afternoon: string }
export const defaultSpace = (): SpaceSettings => ({rules: [], notes: '', enabled: false, weekdays_only: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York', morning: '09:00', afternoon: '13:00'});
export const RZ_VIDEOS = [
 {id: 'QqSeDPpJY0Q', title: 'TradingView setup'},
 {id: 'DAWv527aYqg', title: 'Chart markup walkthrough'},
 {id: '-_nlVEipvJE', title: 'Supply & demand zones'},
];
// Stable throughout each New York calendar day; rotates without reshuffling on rerender.
export function dailyVideos(date = new Date()) {
 const day = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const [year,month,d] = day.split('-').map(Number);
 const offset = Math.floor(Date.UTC(year,month-1,d)/86400000) % RZ_VIDEOS.length;
 return [RZ_VIDEOS[offset], RZ_VIDEOS[(offset+1)%RZ_VIDEOS.length]];
}
export function validateSpace(s: SpaceSettings): string | null {
 if(s.rules.length>12 || s.rules.some(v=>!v.trim() || v.length>180)) return 'Keep up to 12 rules, each under 180 characters.';
 if(s.notes.length>2000) return 'Keep notes under 2,000 characters.';
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.morning) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.afternoon) || s.morning >= '12:00' || s.afternoon < '12:00') return 'Choose a morning time before noon and an afternoon time after noon.';
 try { new Intl.DateTimeFormat('en',{timeZone:s.timezone}).format(); } catch { return 'Choose a valid time zone.'; }
 if(s.enabled && !s.rules.length && !s.notes.trim()) return 'Add a rule or note before enabling reminders.';
 return null;
}
