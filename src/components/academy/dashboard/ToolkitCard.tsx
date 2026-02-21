import { useNavigate } from "react-router-dom";
import { Wrench, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ToolkitCard() {
  const navigate = useNavigate();

  return (
    <div className="vault-glass-card p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Wrench className="h-4.5 w-4.5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Toolkit: Everything you need</h2>
          <p className="text-xs text-muted-foreground">Calculators, templates, presets & downloads</p>
        </div>
      </div>

      <div className="flex gap-2.5">
        <Button
          onClick={() => navigate("/academy/resources")}
          className="gap-2 h-11 flex-1"
        >
          <Wrench className="h-4 w-4" />
          Open Toolkit
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/academy/resources")}
          className="gap-2 h-11 flex-1"
        >
          <FileText className="h-4 w-4" />
          Browse Templates
        </Button>
      </div>
    </div>
  );
}
