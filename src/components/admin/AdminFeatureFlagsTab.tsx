import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function AdminFeatureFlagsTab() {
  const { flags, isLoading } = useFeatureFlags();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggle = async (pageKey: string, enabled: boolean) => {
    setUpdating(pageKey);
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("page_key", pageKey);

    if (error) {
      toast.error("Failed to update flag");
    } else {
      toast.success(`${pageKey} ${enabled ? "enabled" : "hidden"}`);
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    }
    setUpdating(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Page Visibility</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Hide pages from members while they're under development. Admins always see all pages.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
        {flags.map((flag) => (
          <div
            key={flag.page_key}
            className="flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              {flag.enabled ? (
                <Eye className="h-4 w-4 text-emerald-400" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground/50" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{flag.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  /{flag.page_key}
                  {!flag.enabled && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Hidden from members
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Switch
              checked={flag.enabled}
              onCheckedChange={(val) => handleToggle(flag.page_key, val)}
              disabled={updating === flag.page_key}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
