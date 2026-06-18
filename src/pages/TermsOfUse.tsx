import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";

export default function TermsOfUse() {
  return (
    <LegalDocumentLayout title="Terms of Use" updatedOn="June 18, 2026">
      <p>
        These Terms of Use govern your access to and use of Vault OS, including its educational content, account tools,
        community features, and in-app subscription access.
      </p>

      <h2>Service Description</h2>
      <p>
        Vault OS provides educational video content, training resources, community communication features, and account
        functionality for authorized users.
      </p>

      <h2>Subscriptions</h2>
      <p>
        Vault OS may offer an auto-renewing monthly subscription inside the app. The subscription title, duration, and
        price are shown in the purchase flow before you subscribe. Subscriptions renew automatically unless canceled
        through your Apple account settings at least 24 hours before the end of the current billing period.
      </p>

      <h2>Acceptable Use</h2>
      <ul>
        <li>Do not post unlawful, abusive, threatening, or objectionable content.</li>
        <li>Do not impersonate other users or misuse community features.</li>
        <li>Do not attempt to disrupt, bypass, or interfere with the app or its security controls.</li>
      </ul>

      <h2>Community Moderation</h2>
      <p>
        Vault OS may review reports, remove content, restrict accounts, or remove users who violate safety rules or
        abuse the service.
      </p>

      <h2>Account Responsibility</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for activity that
        occurs under your account.
      </p>

      <h2>Deletion and Termination</h2>
      <p>
        You may delete your account in-app at <strong>Settings -&gt; Account -&gt; Delete Account</strong>. We may also
        suspend or terminate access if these Terms are violated or if required for security or legal reasons.
      </p>

      <h2>No Financial Advice</h2>
      <p>
        Vault OS content is provided for education and informational purposes only and should not be treated as
        investment, financial, legal, or tax advice.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these Terms, contact <a href="mailto:vault@vaulttradingacademy.com">vault@vaulttradingacademy.com</a>.
      </p>
    </LegalDocumentLayout>
  );
}
