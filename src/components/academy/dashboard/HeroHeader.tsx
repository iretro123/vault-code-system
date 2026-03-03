import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, PenLine, TrendingUp, Sparkles, ClipboardCheck, BarChart3, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  firstName: string;
  onCheckIn: () => void;
}

const CREATE_ITEMS = [
  { icon: TrendingUp, label: "Log Trade", route: "/academy/trade" },
  { icon: PenLine, label: "Post in Trade Floor", route: "/academy/community" },
  { icon: Sparkles, label: "Ask Coach", action: "coach" },
  { icon: ClipboardCheck, label: "Start Daily Check-In", action: "checkin" },
  { icon: BarChart3, label: "Run Weekly Review", route: "/academy/journal" },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function useStatusLine(userId: string | undefined) {
  const [message, setMessage] = useState<string>("Your trading discipline journey continues");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    resolveStatus(userId).then((msg) => {
      if (!cancelled) setMessage(msg);
    });

    return () => { cancelled = true; };
  }, [userId]);

  return message;
}

async function resolveStatus(userId: string): Promise<string> {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const mondayDate = monday.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [journalRes, liveRes, streakRes] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
    supabase
      .from("live_sessions")
      .select("id, title")
      .gte("session_date", now.toISOString())
      .lte("session_date", tomorrow.toISOString())
      .order("session_date", { ascending: true })
      .limit(1),
    supabase
      .from("vault_daily_checklist")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),
  ]);

  if (liveRes.data && liveRes.data.length > 0) {
    return `Live session tonight: "${liveRes.data[0].title}"`;
  }
  if ((journalRes.count ?? 0) === 0) {
    return "No journal entries this week. Log a trade to stay accountable.";
  }
  const dayOfWeek = now.getDay();
  if (dayOfWeek >= 5 || dayOfWeek === 0) {
    return "Weekly review is due. Reflect before the week resets.";
  }
  if (streakRes.data && streakRes.data.length >= 3) {
    return `${streakRes.data.length}-day check-in streak active. Keep it going.`;
  }
  return "Your trading discipline journey continues";
}

export function HeroHeader({ firstName, onCheckIn }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, status, isAdminBypass } = useStudentAccess();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const statusLine = useStatusLine(user?.id);

  const showUpgrade = !hasAccess && !isAdminBypass;
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      const url = data?.url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (err: any) {
      console.error("[AccessGate] Checkout error:", err);
      toast.error("Unable to start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const handleItem = (item: (typeof CREATE_ITEMS)[number]) => {
    if (item.action === "coach") {
      window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
    } else if (item.action === "checkin") {
      onCheckIn();
    } else if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-7 relative overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 20% 50%, hsl(var(--primary) / 0.35), transparent), radial-gradient(ellipse 60% 80% at 80% 30%, hsl(217 91% 60% / 0.2), transparent), radial-gradient(ellipse 50% 50% at 50% 80%, hsl(199 89% 48% / 0.15), transparent)",
          animation: "heroGradientShift 8s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes heroGradientShift {
          0% { transform: scale(1) translate(0, 0); opacity: 0.25; }
          33% { transform: scale(1.05) translate(2%, -1%); opacity: 0.35; }
          66% { transform: scale(0.98) translate(-1%, 2%); opacity: 0.3; }
          100% { transform: scale(1.03) translate(1%, -2%); opacity: 0.4; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
        <div className="space-y-2">
          {/* Online indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/90">
              Online
            </span>
          </div>

          {/* Greeting */}
          <h1 className="text-[26px] md:text-[32px] font-bold tracking-tight leading-tight text-muted-foreground">
            {getGreeting()},{" "}
            <span className="text-primary">{firstName}</span>
          </h1>

          {/* Dynamic status line */}
          <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-lg">
            {statusLine}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showUpgrade && (
            <Button onClick={handleCheckout} disabled={checkoutLoading} className="gap-2 h-11 px-5" variant={isPastDue || isCanceled ? "outline" : "default"}>
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isPastDue ? "Update Billing" : isCanceled ? "Rejoin" : "Join Vault Academy"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={showUpgrade ? "outline" : "default"} className="gap-2 h-11 px-5">
                <Plus className="h-4 w-4" />
                Create
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-popover border border-border z-50"
            >
              {CREATE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={() => handleItem(item)}
                    className="gap-2.5 py-2.5 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-primary/70" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
