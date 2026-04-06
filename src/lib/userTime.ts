/**
 * Shared timezone-aware formatting utilities.
 * Uses Intl.DateTimeFormat — zero extra dependencies.
 */

/** Format a Date/ISO string as "2:30 PM" in a specific IANA timezone */
export function formatTimeInTZ(isoOrDate: string | Date, tz: string): string {
  return new Date(isoOrDate).toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a Date/ISO string as "Apr 10, 2:30 PM" in a specific IANA timezone */
export function formatDateTimeInTZ(isoOrDate: string | Date, tz: string): string {
  return new Date(isoOrDate).toLocaleString("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a Date/ISO string as "EEEE, MMMM d" in a specific IANA timezone */
export function formatDateInTZ(isoOrDate: string | Date, tz: string): string {
  return new Date(isoOrDate).toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Get short timezone abbreviation like "EST", "PST", "GMT+1" */
export function getTZAbbr(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value || "";
}

/**
 * Convert an ET time string like "08:30" on a given date to a UTC Date object.
 * Handles DST automatically by detecting the real ET offset via Intl.
 */
export function etTimeToUTCDate(dateStr: string, timeET: string): Date {
  const [h, m] = timeET.split(":").map(Number);
  const now = new Date();
  // Detect current ET offset using Intl
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-4";
  const offsetMatch = tzPart.match(/GMT([+-]\d+)/);
  const etOffsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -4;
  // Build UTC: treat dateStr + timeET as ET, subtract offset to get UTC
  const targetUTC = new Date(
    `${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`
  );
  return new Date(targetUTC.getTime() - etOffsetHours * 60 * 60 * 1000);
}

/** Get the user's timezone, falling back to browser detection */
export function getUserTimezone(profileTZ?: string | null): string {
  if (profileTZ) return profileTZ;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}
