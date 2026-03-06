import { PageHeader } from "@/components/layout/PageHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { AcademyProfileForm } from "@/components/academy/AcademyProfileForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const AcademyProfile = () => {
  const { profile, loading } = useAuth();

  // If profile is already completed, redirect to settings
  if (!loading && profile && (profile as any).profile_completed) {
    return <Navigate to="/academy/settings" replace />;
  }

  return (
    <>
      <PageHeader title="Complete Your Profile" subtitle="Set up your Academy identity to get started" />
      <div className="px-4 md:px-6 pb-6 max-w-lg">
        <AcademyProfileForm isOnboarding />
      </div>
    </>
  );
};

export default AcademyProfile;
