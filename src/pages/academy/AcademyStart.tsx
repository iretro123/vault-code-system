import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";

const AcademyStart = () => (
  <AcademyLayout>
    <PageHeader
      title="Start Here"
      subtitle="Claim your role and set your experience level"
    />
    <div className="px-4 md:px-6 pb-6">
      <Card className="p-6 max-w-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Set Up Your Profile</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tell us about your experience level so we can tailor your learning path.
            </p>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </AcademyLayout>
);

export default AcademyStart;
