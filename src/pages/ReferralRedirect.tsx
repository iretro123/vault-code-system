import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { captureReferral } from "@/lib/referralCapture";
import { isNativeIOSApp } from "@/lib/platform";

const WHOP_CHECKOUT = "https://whop.com/checkout/plan_C385Mm2Dtaquc";

export default function ReferralRedirect() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      captureReferral(userId);
    }
    if (isNativeIOSApp()) {
      navigate("/signup", { replace: true });
      return;
    }
    window.location.href = WHOP_CHECKOUT;
  }, [navigate, userId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Redirecting…</p>
    </div>
  );
}
