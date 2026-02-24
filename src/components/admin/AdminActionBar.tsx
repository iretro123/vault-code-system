import { AdminOnly } from "./AdminOnly";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}

interface AdminActionBarProps {
  title: string;
  actions: AdminAction[];
  /** Optional RBAC permission key required to render */
  permission?: string;
}

/**
 * Compact iOS-style inline toolbar for admin actions.
 * Only renders when Admin Mode is ON + permission check passes.
 */
export function AdminActionBar({ title, actions, permission }: AdminActionBarProps) {
  return (
    <AdminOnly permission={permission}>
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/[0.06] border border-primary/10">
        <Settings2 className="h-3.5 w-3.5 text-primary/60 shrink-0" />
        <span className="text-xs font-medium text-primary/70 mr-auto">{title}</span>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              disabled={action.disabled ?? !action.onClick}
              onClick={action.onClick}
              className="h-7 px-2.5 text-xs gap-1.5 text-primary/80 hover:text-primary hover:bg-primary/10"
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </AdminOnly>
  );
}
