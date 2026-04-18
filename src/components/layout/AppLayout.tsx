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
      <div className="academy-mobile-fit h-[100dvh] bg-background flex flex-col w-full overflow-hidden">
        <TopBar />
        <VaultCommandBar sessionPaused={sessionPaused} />
        <main className="academy-main-safe academy-content-safe flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4 md:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
