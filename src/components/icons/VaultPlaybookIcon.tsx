import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function VaultPlaybookIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* Tablet body */}
      <rect x="3" y="1" width="18" height="22" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Screen */}
      <rect x="5.5" y="3.5" width="13" height="15" rx="0.5" fill="currentColor" opacity="0.08" />
      {/* Text lines */}
      <line x1="7" y1="9.5" x2="17" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      <line x1="7" y1="12.5" x2="17" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      <line x1="7" y1="15.5" x2="13" y2="15.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      {/* Title block on screen */}
      <rect x="7" y="5" width="5" height="2.5" rx="0.5" fill="currentColor" opacity="0.5" />
      {/* Bottom bar / home indicator */}
      <line x1="10" y1="21" x2="14" y2="21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
