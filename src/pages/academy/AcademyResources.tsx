import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

const AcademyResources = () => (
  <AcademyLayout>
    <PageHeader
      title="Resources"
      subtitle="Guides, templates, and reference material"
    />
    <div className="px-4 md:px-6 pb-6">
      <Card className="p-8 flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="p-3 rounded-lg bg-muted mb-4">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Resources Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Downloadable checklists, rule templates, and trading guides.
        </p>
      </Card>
    </div>
  </AcademyLayout>
);

export default AcademyResources;
