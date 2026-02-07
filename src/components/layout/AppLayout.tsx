import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { TopBar } from "./TopBar";
import { VaultCommandBar } from "./VaultCommandBar";

interface AppLayoutProps {
  children: ReactNode;
  sessionPaused?: boolean;
}

export function AppLayout({ children, sessionPaused }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <VaultCommandBar sessionPaused={sessionPaused} />
      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}