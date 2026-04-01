import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AcademyProfileForm } from "@/components/academy/AcademyProfileForm";
import { Shield } from "lucide-react";

const AcademyProfile = () => {
  const { profile, loading } = useAuth();

  if (!loading && profile && (profile as any).profile_completed) {
    return <Navigate to="/academy/settings" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 pb-16 px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Welcome header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Vault Academy</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Set up your profile so the community knows who you are. Everything is optional — you can always update later.
          </p>
        </div>

        <AcademyProfileForm isOnboarding />
      </div>
    </div>
  );
};

export default AcademyProfile;
