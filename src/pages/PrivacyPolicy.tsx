import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";

export default function PrivacyPolicy() {
  return (
    <LegalDocumentLayout title="Privacy Policy" updatedOn="June 18, 2026">
      <p>
        This Privacy Policy describes how Vault Trading Academy LLC ("Vault Trading Academy", "we",
        "us", or "our") collects, uses, and shares information when you use the Vault OS mobile
        application and related services (collectively, the "App"). Vault OS is distributed through
        the Apple App Store and is intended for users aged 17 and older.
      </p>
      <p>
        By creating an account or using the App, you agree to the practices described in this
        Privacy Policy and to our <a href="/terms-of-use">Terms of Use</a> and the Apple Standard
        End User License Agreement (EULA).
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We collect only the information needed to operate the App and to comply with Apple App Store
        requirements. The categories of data we collect are also disclosed in the App's Privacy
        Nutrition Label on the App Store product page.
      </p>
      <ul>
        <li>
          <strong>Account data:</strong> email address, password (stored as a salted hash), display
          name, and authentication identifiers.
        </li>
        <li>
          <strong>Profile data:</strong> profile photo, bio, trading preferences, and notification
          settings you choose to provide.
        </li>
        <li>
          <strong>User content:</strong> messages, posts, reactions, journal entries, trade logs,
          and reports you submit through the App.
        </li>
        <li>
          <strong>Usage and diagnostic data:</strong> lesson progress, in-app activity, crash logs,
          and performance data used to maintain and improve the App.
        </li>
        <li>
          <strong>Purchase status:</strong> the status of your Apple in-app subscription (active,
          expired, in grace period) returned to the App by Apple. We do <strong>not</strong> receive
          or store your credit card number, Apple ID password, or full payment details — all
          purchases are processed by Apple.
        </li>
        <li>
          <strong>Device data:</strong> device model, operating system version, language, time zone,
          and a randomly generated device identifier used for push notifications (APNs token) if you
          enable notifications.
        </li>
      </ul>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To create, secure, and authenticate your account.</li>
        <li>To deliver educational content, community features, and coaching tools.</li>
        <li>To save your in-app progress, journal, and preferences across devices.</li>
        <li>To process and verify your Apple in-app subscription status.</li>
        <li>To send transactional and optional push notifications.</li>
        <li>To review reports, enforce Acceptable Use rules, and protect users.</li>
        <li>To diagnose crashes, prevent abuse, and improve App performance.</li>
        <li>To comply with legal obligations and respond to lawful requests.</li>
      </ul>

      <h2>3. Tracking</h2>
      <p>
        Vault OS does <strong>not</strong> track you across apps and websites owned by other
        companies and does not use the Apple App Tracking Transparency (ATT) framework. We do not
        share data with data brokers, do not use third-party advertising SDKs, and do not build
        cross-app advertising profiles.
      </p>

      <h2>4. How Information Is Shared</h2>
      <p>
        We do not sell your personal information. We share data only with service providers that
        help us operate the App, and only to the extent needed to provide the service:
      </p>
      <ul>
        <li>
          <strong>Apple Inc.</strong> — App Store distribution, in-app purchase processing, and push
          notification delivery (APNs).
        </li>
        <li>
          <strong>Cloud infrastructure providers</strong> — secure hosting, authenticated database
          access, file storage, and serverless functions for the App backend.
        </li>
        <li>
          <strong>Email and customer-support providers</strong> — transactional email and customer
          support communication.
        </li>
      </ul>
      <p>
        We may also disclose information if required by law, valid legal process, or to protect the
        rights, property, or safety of Vault Trading Academy, our users, or the public.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain account and content data while your account is active and for as long as needed to
        provide the service, comply with legal obligations, resolve disputes, and enforce our
        agreements. When you delete your account, we permanently remove or irreversibly anonymize
        your account data, subject to limited backups and legally required records.
      </p>

      <h2>6. Account Deletion (Apple Guideline 5.1.1(v))</h2>
      <p>
        You can permanently delete your account and associated personal data directly inside the App
        at <strong>Settings → Account → Delete Account</strong>. No email request or web form is
        required.
      </p>
      <p>
        After confirming deletion, your account is closed immediately and can no longer be used to
        sign in. To cancel any active Apple subscription, follow Section 8 below — deleting your
        Vault OS account does not automatically cancel an Apple in-app subscription.
      </p>

      <h2>7. Children's Privacy</h2>
      <p>
        Vault OS is rated <strong>17+</strong> on the App Store and is not directed to children
        under 13 (or the equivalent minimum age in your jurisdiction). We do not knowingly collect
        personal information from children. If you believe a child has provided us with personal
        information, contact us and we will delete it.
      </p>

      <h2>8. Managing Your Apple Subscription</h2>
      <p>
        Subscriptions are billed to your Apple ID and managed by Apple. You can view, change, or
        cancel an active subscription at any time from{" "}
        <strong>Settings → [your name] → Subscriptions</strong> on your Apple device, or at{" "}
        <a
          href="https://apps.apple.com/account/subscriptions"
          target="_blank"
          rel="noopener noreferrer"
        >
          apps.apple.com/account/subscriptions
        </a>
        .
      </p>

      <h2>9. Your Privacy Rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, port, restrict, or
        delete your personal data, and to withdraw consent. You can exercise most of these rights
        directly in the App or by contacting us at the address below. We will not discriminate
        against you for exercising your privacy rights.
      </p>

      <h2>10. International Data Transfers</h2>
      <p>
        Your information may be processed and stored in the United States or other countries where
        our service providers operate. Where required, we rely on appropriate safeguards for
        international transfers.
      </p>

      <h2>11. Security</h2>
      <p>
        We use industry-standard security measures, including encryption in transit (TLS),
        encryption at rest, hashed passwords, and row-level access controls. No method of
        transmission or storage is 100% secure, but we work continuously to protect your data.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be communicated
        through the App or by email. Continued use of the App after an update constitutes acceptance
        of the revised Policy.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        Vault Trading Academy LLC
        <br />
        Privacy questions:{" "}
        <a href="mailto:vault@vaulttradingacademy.com">vault@vaulttradingacademy.com</a>
      </p>
    </LegalDocumentLayout>
  );
}
