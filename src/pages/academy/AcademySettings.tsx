import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  User,
  UserRound,
  BarChart3,
  Bell,
  Shield,
  HelpCircle,
  Database,
  CreditCard,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

import { SettingsProfile } from "@/components/settings/SettingsProfile";
import { SettingsAccount } from "@/components/settings/SettingsAccount";
import { SettingsTradingPrefs } from "@/components/settings/SettingsTradingPrefs";
import { SettingsNotifications } from "@/components/settings/SettingsNotifications";
import { SettingsPrivacy } from "@/components/settings/SettingsPrivacy";
import { SettingsSecurity } from "@/components/settings/SettingsSecurity";
import { SettingsHelp } from "@/components/settings/SettingsHelp";
import { SettingsBilling } from "@/components/settings/SettingsBilling";
import { isBillingVisible } from "@/lib/featureFlags";
import { Button } from "@/components/ui/button";

const ALL_NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: UserRound },
  { id: "trading", label: "Trading Preferences", icon: BarChart3 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Data", icon: Database },
  { id: "security", label: "Security", icon: Shield },
  { id: "help", label: "Help", icon: HelpCircle },
] as const;

const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => isBillingVisible() || item.id !== "billing");

type SectionId = (typeof ALL_NAV_ITEMS)[number]["id"];

const AcademySettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const billingReturn = isBillingVisible() && searchParams.get("billing") === "returned";
  const requestedSection = searchParams.get("section");
  const requestedValidSection = NAV_ITEMS.some((item) => item.id === requestedSection)
    ? (requestedSection as SectionId)
    : null;
  const initial: SectionId = billingReturn ? "billing" : (requestedValidSection ?? "profile");
  const [section, setSection] = useState<SectionId>(initial);
  const [mobileOpen, setMobileOpen] = useState<SectionId | null>(
    billingReturn || requestedValidSection ? initial : null
  );

  useEffect(() => {
    if (billingReturn) {
      searchParams.delete("billing");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!requestedValidSection) return;
    setSection(requestedValidSection);
    setMobileOpen(requestedValidSection);
  }, [requestedValidSection]);

  return (
    <>
      <div className="flex flex-1 min-h-0">
        {/* Left nav — desktop */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/40 py-6 px-3 gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-3">
            Settings
          </h2>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left w-full",
                section === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* Mobile section picker */}
        <div className="md:hidden w-full">
          {mobileOpen === null ? (
            <>
              <div className="px-4 pt-4 pb-3">
                <h1 className="text-lg font-bold text-foreground">Vault Settings</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Control your profile, account, alerts, privacy, and account deletion.
                </p>
              </div>
              <div className="px-3 pb-3">
                <div className="rounded-xl border border-border/40 bg-card/40 p-3">
                  <p className="text-sm font-semibold text-foreground">Need to delete your account?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Open Account to permanently delete your Vault OS account inside the app.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-10 w-full rounded-xl"
                    onClick={() => { setSection("account"); setMobileOpen("account"); }}
                  >
                    Open Account
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 px-3 pb-24">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setSection(id); setMobileOpen(id); }}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/30 transition-colors w-full text-left"
                  >
                    <Icon className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="px-4 pb-24">
              <button
                onClick={() => setMobileOpen(null)}
                className="flex items-center gap-1.5 text-sm text-primary font-medium py-3 -ml-0.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Settings
              </button>
              <SettingsPanelAll section={section} />
            </div>
          )}
        </div>

        {/* Main panel — desktop */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          <div className="px-8 pt-6 pb-4">
            <h1 className="text-xl font-bold text-foreground">Vault Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Control your profile, account, alerts, privacy, and account deletion.
            </p>
            <div className="mt-4 rounded-2xl border border-border/40 bg-card/40 p-4">
              <p className="text-sm font-semibold text-foreground">Account</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Open Account to access the dedicated Delete Account flow inside the app.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-10 rounded-xl"
                onClick={() => setSection("account")}
              >
                Open Account
              </Button>
            </div>
          </div>
          <div className="px-8 pb-12 max-w-2xl">
            <SettingsPanelAll section={section} />
          </div>
        </div>
      </div>
    </>
  );
};

const PANELS: { id: SectionId; Component: React.FC }[] = [
  { id: "profile", Component: SettingsProfile },
  { id: "account", Component: SettingsAccount },
  { id: "trading", Component: SettingsTradingPrefs },
  { id: "billing", Component: SettingsBilling },
  { id: "notifications", Component: SettingsNotifications },
  { id: "privacy", Component: SettingsPrivacy },
  { id: "security", Component: SettingsSecurity },
  { id: "help", Component: SettingsHelp },
];

function SettingsPanelAll({ section }: { section: SectionId }) {
  return (
    <>
      {PANELS.map(({ id, Component }) => (
        <div key={id} className={section === id ? "block" : "hidden"}>
          <Component />
        </div>
      ))}
    </>
  );
}

export default AcademySettings;
