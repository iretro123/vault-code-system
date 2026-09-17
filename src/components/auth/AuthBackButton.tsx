import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { safeBack } from "@/lib/safeBack";

interface AuthBackButtonProps {
  fallback?: string;
  className?: string;
}

export const AuthBackButton = ({ fallback = "/welcome", className = "" }: AuthBackButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        safeBack(navigate, fallback);
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground ${className}`}
      aria-label="Back"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
};
