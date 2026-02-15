import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CoachRequest {
  id: string;
  user_id: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
}

const AcademyAdmin = () => {
  const { isAdmin } = useAcademyRole();
  const [requests, setRequests] = useState<CoachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from("coach_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setRequests((data as CoachRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRequests();
  }, [isAdmin, fetchRequests]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "closed" : "open";
    setUpdating(id);
    await supabase.from("coach_requests").update({ status: newStatus }).eq("id", id);
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    setUpdating(null);
  };

  if (!isAdmin) {
    return <Navigate to="/academy/home" replace />;
  }

  return (
    <AcademyLayout>
      <PageHeader
        title="Admin Panel"
        subtitle="Manage Academy content and users"
      />
      <div className="px-4 md:px-6 pb-6 space-y-6">
        {/* Coach Requests */}
        <div>
          <p className="section-title mb-3">Coach Requests</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            </Card>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {requests.map((req) => (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          {req.category}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-medium",
                          req.status === "open" ? "text-amber-400" : "text-emerald-400"
                        )}>
                          {req.status === "open" ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {req.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {format(new Date(req.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{req.message}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(req.id, req.status)}
                      disabled={updating === req.id}
                      className="shrink-0 text-xs"
                    >
                      {updating === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : req.status === "open" ? (
                        "Resolve"
                      ) : (
                        "Reopen"
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyAdmin;
