import { PageHeader } from "@/components/layout/PageHeader";
import { VaultTradePlanner } from "@/components/vault-planner/VaultTradePlanner";
import { useApprovedPlans } from "@/hooks/useApprovedPlans";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function AcademyVaultApproval() {
  const { activePlan } = useApprovedPlans();

  return (
    <>
      <PageHeader
        title="VAULT Approval"
        subtitle="Every trade gets checked before you enter."
        action={
          activePlan ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs gap-1">
              <Check className="h-3 w-3" /> Active plan
            </Badge>
          ) : undefined
        }
      />
      <div className="px-4 md:px-6 pb-10">
        <VaultTradePlanner />
      </div>
    </>
  );
}
