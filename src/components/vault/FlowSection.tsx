import React, { useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionStatus = "active" | "completed" | "locked";

interface FlowSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  status?: SectionStatus;
  locked?: boolean;
  lockedSubtitle?: string;
  children: React.ReactNode;
  onContinue?: () => void;
  showContinue?: boolean;
  sectionRef?: React.RefObject<HTMLDivElement>;
}

function StatusDot({ status }: { status: SectionStatus }) {
  if (status === "completed") {
    return (
      <span className="flex items-center justify-center w-[10px] h-[10px] rounded-full bg-emerald-500/80">
        <Check className="w-2 h-2 text-white" strokeWidth={3} />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="w-[10px] h-[10px] rounded-full bg-primary status-dot-active" />
    );
  }

  // Locked / future state - hollow dot
  return (
    <span className="w-[10px] h-[10px] rounded-full border-2 border-muted-foreground/50" />
  );
}

export function FlowSection({
  title,
  isOpen,
  onToggle,
  status,
  locked = false,
  lockedSubtitle = "Not available",
  children,
  onContinue,
  showContinue = true,
  sectionRef,
}: FlowSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>(undefined);

  // Derive status if not explicitly provided
  const derivedStatus: SectionStatus = status ?? (locked ? "locked" : isOpen ? "active" : "locked");

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, children]);

  const handleToggle = () => {
    if (!locked) {
      onToggle();
    }
  };

  return (
    <div
      ref={sectionRef}
      className="vault-card rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={locked}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left transition-colors",
          locked
            ? "cursor-not-allowed opacity-70"
            : "hover:bg-muted/30 cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2.5">
          <StatusDot status={derivedStatus} />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {title}
          </h2>
          {locked && (
            <span className="text-xs text-muted-foreground ml-1">
              — {lockedSubtitle}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && !locked && "rotate-180"
          )}
        />
      </button>

      {/* Collapsible Content */}
      <div
        style={{ height: locked ? 0 : height }}
        className="transition-[height] duration-200 ease-out overflow-hidden"
      >
        <div ref={contentRef} className="px-4 pb-4">
          {children}

          {/* Continue Button */}
          {showContinue && onContinue && !locked && (
            <button
              type="button"
              onClick={onContinue}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
