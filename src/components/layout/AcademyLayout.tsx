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
import { Loader2, ShieldAlert } from "lucide-react";

interface AcademyLayoutProps {
  children: ReactNode;
}

export function AcademyLayout({ children }: AcademyLayoutProps) {
  const { user, profile, loading } = useAuth();
  useSmartNotifications();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AcademySidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
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

          {/* Content */}
          <main className="flex-1 pb-20 md:pb-6">
            {children}
          </main>

          <MobileNav />
          <AskCoachButton />
        </div>
      </div>
    </SidebarProvider>
  );
}
