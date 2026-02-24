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
      {/* Left page */}
      <path
        d="M2 4.5C2 4.5 5 3 8.5 3C10.5 3 11.5 3.5 12 4C12 4 12 18 12 19C11.5 18.5 10.5 18 8.5 18C5 18 2 19.5 2 19.5V4.5Z"
        stroke="#3B82F6"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right page */}
      <path
        d="M22 4.5C22 4.5 19 3 15.5 3C13.5 3 12.5 3.5 12 4C12 4 12 18 12 19C12.5 18.5 13.5 18 15.5 18C19 18 22 19.5 22 19.5V4.5Z"
        stroke="#3B82F6"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom curve */}
      <path
        d="M2 19.5C5 18 8.5 18 12 19C15.5 18 19 18 22 19.5"
        stroke="#3B82F6"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}
