import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { TopBar } from "./TopBar";
import { VaultCommandBar } from "./VaultCommandBar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <VaultCommandBar />
      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}