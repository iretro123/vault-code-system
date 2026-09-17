import { CalendarPlus } from 'lucide-react';
import { googleClassCalendarUrl } from '@/lib/vaultClassCalendar';

export function AddClassCalendar({ wednesday, zoomUrl }: { wednesday: boolean; zoomUrl?: string }) {
  return <div className="vl-calendar-area">
    <div className="vl-calendar-controls">
      <a className="vl-add-calendar" href={googleClassCalendarUrl(wednesday, zoomUrl)} target="_blank" rel="noopener noreferrer">
        <CalendarPlus size={18} aria-hidden="true"/> Add to calendar
      </a>
    </div>
  </div>;
}
