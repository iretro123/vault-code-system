import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";

/**
 * Billing/upgrade UI is intentionally hidden — see src/lib/featureFlags.ts.
 * Original plan definitions are preserved in git history and can be restored
 * by re-enabling FEATURE_FLAGS.BILLING_VISIBLE.
 */
const Upgrade = () => {
  return (
    <AppLayout>
      <PageHeader title="Membership" subtitle="" />
      <div className="px-4 md:px-6 pb-6">
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="space-y-3 text-center">
            <h3 className="text-lg font-semibold">Membership changes are unavailable right now</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please contact your coach or support if you have questions about
              your membership.
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Upgrade;
