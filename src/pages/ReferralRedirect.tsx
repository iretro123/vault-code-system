import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { captureReferral } from "@/lib/referralCapture";

const WHOP_CHECKOUT = "https://whop.com/checkout/plan_2rZoF4rd1mLMc";

export default function ReferralRedirect() {
  const { userId } = useParams<{ userId: string }>();

  useEffect(() => {
    if (userId) {
      captureReferral(userId);
    }
    window.location.href = WHOP_CHECKOUT;
  }, [userId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Redirecting…</p>
    </div>
  );
}
