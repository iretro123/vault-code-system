/** Recovery must use the verified account email, never a caller-selected identity. */
export function ownsMembershipEmail(requested: unknown, verified: string | undefined): boolean {
  return typeof requested === "string" && !!verified &&
    requested.trim().toLowerCase() === verified.trim().toLowerCase();
}

/** Preserve renewal grace, but never treat an incomplete first payment as grace. */
export function stripeAccessStatus(status: string): string {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "paused":
      return status;
    case "incomplete":
      return "paused";
    default:
      return "canceled";
  }
}

export function invoiceSubscriptionId(invoice: {
  subscription?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
}): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription ?? invoice.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id ?? null;
}
