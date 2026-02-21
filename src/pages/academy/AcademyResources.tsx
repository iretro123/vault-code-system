import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Calculator, FileText, ClipboardList, Layers, Download } from "lucide-react";

const RESOURCES = [
  {
    title: "Risk Calculator",
    description: "Position sizing based on account balance, stop loss, and risk tolerance.",
    icon: Calculator,
    route: "/risk-calculator",
  },
  {
    title: "Templates",
    description: "Pre-trade checklists, journal templates, and daily review forms.",
    icon: FileText,
    route: null,
  },
  {
    title: "Market Prep Checklist",
    description: "Step-by-step routine to run before the market opens.",
    icon: ClipboardList,
    route: null,
  },
  {
    title: "Setup Library",
    description: "Reference library of documented setups with entry/exit criteria.",
    icon: Layers,
    route: null,
  },
  {
    title: "Downloads",
    description: "PDF guides, worksheets, and quick-reference cards.",
    icon: Download,
    route: null,
  },
];

const AcademyResources = () => {
  const navigate = useNavigate();

  return (
    <AcademyLayout>
      <PageHeader
        title="Resources"
        subtitle="Trader toolkit — guides, templates, and reference material"
      />
      <div className="px-4 md:px-6 pb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const isActive = !!r.route;
            return (
              <Card
                key={r.title}
                className={`vault-card p-5 flex flex-col gap-3 ${isActive ? "cursor-pointer hover:border-primary/30 transition-colors" : "opacity-60"}`}
                onClick={() => isActive && navigate(r.route!)}
              >
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                </div>
                {!isActive && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">Coming Soon</span>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyResources;
