import { Link } from "react-router-dom";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";

/**
 * Prominent activation card for members who already paid on the website.
 * Native apps get neutral account-recovery wording: no pricing, purchase or
 * sales links. Store "Restore" only covers store purchases, so web members
 * connect through the same verified email-link activation page.
 */
export function PaidRecoveryLink() {
  const [title, sub] =
    isNativeIOSApp() || isNativeAndroidApp()
      ? (["Already paid on our website?", "Verify the email on your membership. No second payment."] as const)
      : (["Already paid through Stripe?", "Use your checkout email. No second payment."] as const);

  return (
    <Link className="vault-paid-recovery" to="/activate-return">
      <span className="vault-paid-recovery-icon" aria-hidden="true">
        <BadgeCheck size={18} />
      </span>
      <span className="vault-paid-recovery-text">
        <b>{title}</b>
        <small>{sub}</small>
      </span>
      <ChevronRight size={18} className="vault-paid-recovery-arrow" aria-hidden="true" />
    </Link>
  );
}
