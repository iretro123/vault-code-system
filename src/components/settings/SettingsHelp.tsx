import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Rocket, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SettingsHelp() {
  const navigate = useNavigate();

  return (
    <Card className="vault-card p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Help</h3>
        <p className="text-xs text-muted-foreground">Fast answers + support.</p>
      </div>

      <div className="space-y-3">
        <Button variant="outline" onClick={() => navigate("/academy/my-questions")} className="w-full gap-2 justify-start">
          <MessageSquare className="h-4 w-4" />
          Open Ask Coach
        </Button>

        <Button variant="outline" onClick={() => navigate("/academy/home")} className="w-full gap-2 justify-start">
          <Rocket className="h-4 w-4" />
          How to Start
        </Button>

        <Button variant="outline" asChild className="w-full gap-2 justify-start">
          <a href="mailto:vault@vaulttradingacademy.com">
            <Mail className="h-4 w-4" />
            Contact Support
          </a>
        </Button>
      </div>
    </Card>
  );
}
