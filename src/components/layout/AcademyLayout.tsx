import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PlayerIdentity } from "./PlayerIdentity";
import { AcademySidebar } from "./AcademySidebar";
import { MobileNav } from "./MobileNav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface AcademyLayoutProps {
  children: ReactNode;
}

export function AcademyLayout({ children }: AcademyLayoutProps) {
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
              <PlayerIdentity />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 pb-20 md:pb-6">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
