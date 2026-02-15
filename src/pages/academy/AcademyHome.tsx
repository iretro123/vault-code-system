import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Rocket } from "lucide-react";

const AcademyHome = () => {
  const navigate = useNavigate();

  return (
    <AcademyLayout>
      <PageHeader
        title="Welcome to Vault Academy"
        subtitle="Master the discipline side of trading"
      />
      <div className="px-4 md:px-6 pb-6">
        <div className="max-w-lg">
          <p className="text-muted-foreground mb-6">
            Your structured path to becoming a disciplined, consistent trader starts here.
          </p>
          <Button onClick={() => navigate("/academy/start")} className="gap-2">
            <Rocket className="h-4 w-4" />
            Start Here
          </Button>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyHome;
