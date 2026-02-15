import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AcademyResources = () => {
  const navigate = useNavigate();

  return (
    <AcademyLayout>
      <PageHeader
        title="Resources"
        subtitle="Guides, templates, and reference material"
      />
      <div className="px-4 md:px-6 pb-6">
        <Card className="vault-card p-10 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Resources are on the way</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Downloadable checklists, rule templates, and trading guides will live here. Start with the modules in the meantime.
          </p>
          <Button variant="outline" onClick={() => navigate("/academy/learn")} className="gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Explore Modules
          </Button>
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyResources;
