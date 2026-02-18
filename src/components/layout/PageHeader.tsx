import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="px-4 pt-6 pb-4 md:px-6 md:pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight leading-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1.5 text-sm md:text-base">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}