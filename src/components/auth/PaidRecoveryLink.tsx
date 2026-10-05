import { Link } from "react-router-dom";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";

/**
 * Contextual recovery for members who already paid on the website.
 * Native apps get neutral account-recovery wording: no pricing, purchase or
 * sales links. Store "Restore" only covers store purchases, so web members
 * connect through the same verified email-link activation page.
 */
export function PaidRecoveryLink() {
  if (isNativeIOSApp() || isNativeAndroidApp()) {
    return <p>
      <Link to="/activate-return">Connect your existing membership</Link>
      <small>Joined on our website? Verify the email on your membership.</small>
    </p>;
  }
  return <p>
    <Link to="/activate-return">Already paid through Stripe?</Link>
    <small>Use your checkout email. No second payment.</small>
  </p>;
}
