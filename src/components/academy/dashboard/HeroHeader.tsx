import { useState } from "react";
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

export function HeroHeader({ firstName, onCheckIn }: Props) {
  const navigate = useNavigate();
  const { hasAccess, status, isAdminBypass } = useStudentAccess();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight leading-tight text-foreground">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
          You're one disciplined week away from your next breakthrough.
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
  );
}
