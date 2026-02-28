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
      <rect x="2.4" y="0" width="19.2" height="24" rx="1.6" fill="#33313F" />
      {/* Screen */}
      <rect x="4.3" y="1.9" width="15.4" height="19.4" fill="#B9D2ED" />
      {/* E-BOOK title area — simplified as text lines at small size */}
      <line x1="5.8" y1="6.2" x2="8.2" y2="6.2" stroke="#33313F" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9" y1="6.2" x2="11.4" y2="6.2" stroke="#33313F" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12.2" y1="6.2" x2="14.6" y2="6.2" stroke="#33313F" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="15.4" y1="6.2" x2="17.8" y2="6.2" stroke="#33313F" strokeWidth="1.2" strokeLinecap="round" />
      {/* Content lines */}
      <line x1="5.8" y1="10.2" x2="18.2" y2="10.2" stroke="#33313F" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="5.8" y1="12.9" x2="18.2" y2="12.9" stroke="#33313F" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="5.8" y1="15.6" x2="18.2" y2="15.6" stroke="#33313F" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="5.8" y1="18.4" x2="9.7" y2="18.4" stroke="#33313F" strokeWidth="0.8" strokeLinecap="round" />
      {/* Home indicator */}
      <line x1="10.1" y1="22.5" x2="13.9" y2="22.5" stroke="#62627C" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
