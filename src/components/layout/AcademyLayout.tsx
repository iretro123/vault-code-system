import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PlayerIdentity } from "./PlayerIdentity";
import { MobileNav } from "./MobileNav";

interface AcademyLayoutProps {
  children: ReactNode;
}

export function AcademyLayout({ children }: AcademyLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/cockpit" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Vault<span className="text-primary">Academy</span>
            </span>
          </Link>
          <PlayerIdentity />
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
