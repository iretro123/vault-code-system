import { FeatureFlagGate } from "@/components/FeatureFlagGate";
import TraderCockpit from "@/pages/TraderCockpit";

export default function AcademyVaultOS() {
  return (
    <FeatureFlagGate pageKey="vault-os">
      <TraderCockpit />
    </FeatureFlagGate>
  );
}
