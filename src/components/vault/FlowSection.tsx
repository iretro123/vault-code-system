import React, { useRef, useEffect } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  locked?: boolean;
  lockedSubtitle?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  onContinue?: () => void;
  showContinue?: boolean;
  sectionRef?: React.RefObject<HTMLDivElement>;
}

export function FlowSection({
  title,
  isOpen,
  onToggle,
  locked = false,
  lockedSubtitle = "Complete Daily Ritual first",
  children,
  onContinue,
  showContinue = true,
  sectionRef,
}: FlowSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>(undefined);

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
        <div className="flex items-center gap-2">
          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {title}
          </h2>
          {locked && (
            <span className="text-xs text-muted-foreground ml-2">
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
