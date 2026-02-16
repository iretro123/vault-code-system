import { format, isToday, isYesterday } from "date-fns";

/**
 * Shared time formatting helpers.
 * ALL time display in the app MUST go through these functions.
 * - Always 12-hour with AM/PM
 * - Dates rendered in user's local timezone (JS Date auto-converts)
 */

/** "9:25 PM" — time only, 12-hour */
export function formatTime(date: string | Date): string {
  return format(new Date(date), "h:mm a");
}

/** "Feb 15, 9:25 PM" — short date + time */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "MMM d, h:mm a");
}

/** "Feb 15, 2025, 9:25 PM" — full date + time (for detailed views) */
export function formatDateTimeFull(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy · h:mm a");
}

/** "Feb 15" — short date only */
export function formatDateShort(date: string | Date): string {
  return format(new Date(date), "MMM d");
}

/** "Feb 15, 2025" — date with year */
export function formatDateWithYear(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

/** "MM/dd h:mm a" — compact table format */
export function formatDateCompact(date: string | Date): string {
  return format(new Date(date), "MM/dd h:mm a");
}

/** "yyyy-MM-dd h:mm a" — for CSV/export */
export function formatDateExport(date: string | Date): string {
  return format(new Date(date), "yyyy-MM-dd h:mm a");
}

/**
 * Day separator label for chat: "Today", "Yesterday", or "Feb 15"
 */
export function formatDayLabel(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}
