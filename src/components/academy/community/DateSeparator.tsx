export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="community-date-divider flex items-center gap-3 px-6 py-3">
      <div className="flex-1 h-px bg-white/[0.08]" />
      <span className="text-xs font-medium text-muted-foreground shrink-0">{date}</span>
      <div className="flex-1 h-px bg-white/[0.08]" />
    </div>
  );
}

export function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Compare calendar dates, not elapsed hours (DST days can be 23 or 25 hours).
  const days = (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
    Date.UTC(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate())) / 86400000;

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function shouldShowDateSeparator(currentDate: string, previousDate?: string): boolean {
  if (!previousDate) return true;
  const curr = new Date(currentDate).toDateString();
  const prev = new Date(previousDate).toDateString();
  return curr !== prev;
}
