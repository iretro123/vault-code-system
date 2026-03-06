import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { TopBar } from "./TopBar";
import { VaultCommandBar } from "./VaultCommandBar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface AppLayoutProps {
  children: ReactNode;
  sessionPaused?: boolean;
}

export function AppLayout({ children, sessionPaused }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col w-full">
        <TopBar />
        <VaultCommandBar sessionPaused={sessionPaused} />
        <main className="flex-1 pb-20 md:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
