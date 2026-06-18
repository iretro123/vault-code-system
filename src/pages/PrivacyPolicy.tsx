import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";

export default function PrivacyPolicy() {
  return (
    <LegalDocumentLayout title="Privacy Policy" updatedOn="June 18, 2026">
      <p>
        Vault OS provides educational content, community features, account tools, and in-app subscription access.
        This Privacy Policy explains what information we collect, how we use it, and the choices available to you.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>Account information such as your email address, password login, and display name.</li>
        <li>Profile information you choose to provide, including trading preferences and account settings.</li>
        <li>App activity and progress data, such as lesson progress, journal entries, playbook state, and notifications.</li>
        <li>Community content you create, including messages, reports, and moderation-related actions.</li>
        <li>Subscription and purchase status needed to confirm access inside the app.</li>
      </ul>

      <h2>How We Use Information</h2>
      <ul>
        <li>To create and secure your account.</li>
        <li>To provide access to Vault OS educational content and community features.</li>
        <li>To save your in-app progress, settings, and account preferences.</li>
        <li>To review reports, enforce community safety rules, and protect the service.</li>
        <li>To verify subscription access and keep account status current.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We may use service providers to host infrastructure, authentication,
        storage, notifications, analytics, and support functions needed to operate Vault OS.
      </p>

      <h2>Account Deletion</h2>
      <p>
        You can delete your account inside the app at <strong>Settings -&gt; Account -&gt; Delete Account</strong>.
        Deletion permanently removes or anonymizes account data associated with the app account, and the deleted account
        can no longer be used to sign in.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain information only as long as needed to provide the service, comply with legal obligations, resolve
        disputes, and enforce agreements. When deletion is requested, user-owned data is deleted or anonymized where
        appropriate.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions, contact <a href="mailto:vault@vaulttradingacademy.com">vault@vaulttradingacademy.com</a>.
      </p>
    </LegalDocumentLayout>
  );
}
