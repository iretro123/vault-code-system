export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-2">
      <div className="flex-1 h-px bg-[hsl(220,12%,86%)]" />
      <span className="text-[10px] font-semibold text-[hsl(220,10%,52%)] uppercase tracking-wider shrink-0">{date}</span>
      <div className="flex-1 h-px bg-[hsl(220,12%,86%)]" />
    </div>
  );
}

export function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

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
