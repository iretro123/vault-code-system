import { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { PlayerIdentity } from "./PlayerIdentity";
import { AcademySidebar } from "./AcademySidebar";
import { MobileNav } from "./MobileNav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AskCoachButton } from "@/components/academy/AskCoachButton";
import { NotificationsPanel } from "@/components/academy/NotificationsPanel";
import { useAuth } from "@/hooks/useAuth";
import { useSmartNotifications } from "@/hooks/useSmartNotifications";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { Loader2, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AcademyLayoutProps {
  children: ReactNode;
}

export function AcademyLayout({ children }: AcademyLayoutProps) {
  const { user, profile, loading } = useAuth();
  const { hydrated } = useAcademyData();
  useSmartNotifications();

  if (loading || !hydrated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="h-14 border-b border-white/5 bg-background/80 flex items-center px-4">
          <Skeleton className="h-5 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const accessStatus = (profile as any)?.access_status ?? "trial";

  if (accessStatus === "revoked") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10 mx-auto">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Access Revoked</h1>
          <p className="text-sm text-muted-foreground">
            Your Academy access has been revoked. Please contact support for assistance.
          </p>
          <Link
            to="/hub"
            className="inline-block text-sm text-primary hover:underline mt-2"
          >
            ← Back to Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background relative overflow-hidden">
        {/* Ambient background depth — lightweight, no blur */}
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-[hsl(217,80%,40%/0.08)] opacity-60" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[hsl(200,70%,45%/0.05)] opacity-50" />
        </div>

        {/* Desktop sidebar — contained column, z-10 via sidebar.tsx */}
        <div className="hidden md:block relative z-10">
          <AcademySidebar />
        </div>

        {/* Main content — flex:1, isolated from sidebar */}
        <div className="flex-1 flex flex-col min-w-0 relative z-[1] overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-background/90 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="hidden md:flex" />
                <Link to="/academy/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <span className="text-lg font-bold tracking-tight text-foreground">
                    Vault<span className="text-primary">Academy</span>
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <NotificationsPanel />
                <PlayerIdentity />
              </div>
            </div>
          </header>

          {/* Content — scrollable area */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
            {children}
          </main>

          <MobileNav />
          <AskCoachButton />
        </div>
      </div>
    </SidebarProvider>
  );
}
