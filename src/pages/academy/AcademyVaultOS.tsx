import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { FeatureFlagGate } from "@/components/FeatureFlagGate";
import TraderCockpit from "@/pages/TraderCockpit";

export default function AcademyVaultOS() {
  return (
    <AcademyLayout>
      <FeatureFlagGate pageKey="vault-os">
        <TraderCockpit />
      </FeatureFlagGate>
    </AcademyLayout>
  );
}
