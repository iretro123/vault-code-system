import { PlayerIdentity } from "./PlayerIdentity";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-foreground">
            Vault<span className="text-primary">OS</span>
          </span>
        </div>
        <PlayerIdentity />
      </div>
    </header>
  );
}
