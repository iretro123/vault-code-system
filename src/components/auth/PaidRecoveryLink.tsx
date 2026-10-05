import { Link } from "react-router-dom";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";

/** Small contextual recovery link for members who already paid on the web through Stripe. */
export function PaidRecoveryLink() {
  // App-store purchases restore through the store, not Stripe.
  if (isNativeIOSApp() || isNativeAndroidApp()) return null;
  return <p>
    <Link to="/activate-return">Already paid through Stripe?</Link>
    <small>Use your checkout email. No second payment.</small>
  </p>;
}
