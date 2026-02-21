import { BookOpen, TrendingUp, Video, ClipboardCheck } from "lucide-react";

const STATS = [
  { icon: BookOpen, label: "Lessons completed", value: "2 / 5", color: "rgba(59,130,246,0.14)" },
  { icon: TrendingUp, label: "Trades logged", value: "3", color: "rgba(34,197,94,0.12)" },
  { icon: Video, label: "Live attended", value: "1", color: "rgba(168,85,247,0.12)" },
  { icon: ClipboardCheck, label: "Weekly review", value: "Pending", color: "rgba(245,158,11,0.12)" },
];

export function ThisWeekCard() {
  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">This Week</h3>

      <div className="grid grid-cols-2 gap-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: s.color }}
                >
                  <Icon className="h-3.5 w-3.5 text-white/80" />
                </div>
              </div>
              <p className="text-lg font-bold text-[rgba(255,255,255,0.92)]">{s.value}</p>
              <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[rgba(255,255,255,0.45)] mt-0.5">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
