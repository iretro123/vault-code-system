import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function PageHeader({ title, subtitle, action, compact }: PageHeaderProps) {
  return (
    <header className={compact ? "px-4 pt-4 pb-2 md:px-6 md:pt-8 md:pb-4" : "px-4 pt-6 pb-4 md:px-6 md:pt-8"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className={compact ? "text-[22px] md:text-[32px] font-bold tracking-tight leading-tight text-foreground" : "text-[28px] md:text-[32px] font-bold tracking-tight leading-tight text-foreground"}>{title}</h1>
          {subtitle && (
            <p className={compact ? "text-muted-foreground mt-0.5 text-sm hidden md:block" : "text-muted-foreground mt-1.5 text-sm md:text-base"}>{subtitle}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-1.5 shrink-0">{action}</div>}
      </div>
    </header>
  );
}