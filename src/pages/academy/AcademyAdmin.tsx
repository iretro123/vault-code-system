import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const AcademyAdmin = () => (
  <AcademyLayout>
    <PageHeader
      title="Admin Panel"
      subtitle="Manage Academy content and users"
    />
    <div className="px-4 md:px-6 pb-6">
      <Card className="p-8 flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="p-3 rounded-lg bg-muted mb-4">
          <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Admin Tools Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Manage modules, rooms, users, and live sessions.
        </p>
      </Card>
    </div>
  </AcademyLayout>
);

export default AcademyAdmin;
