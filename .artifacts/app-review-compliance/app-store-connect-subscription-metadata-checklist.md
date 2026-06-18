# Vault OS App Store Connect Metadata Checklist

Vault OS now shows the required subscription information inside the app purchase flow. App Store Connect must still include the same legal metadata before resubmission.

Use these production links:

- Privacy Policy field:
  `https://raw.githubusercontent.com/iretro123/vault-code-system/main/public-legal/privacy-policy.md`
- Terms of Use / EULA:
  `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`

Required Apple-side checks:

1. Privacy Policy field in App Store Connect contains the Privacy Policy URL above.
2. App Description or EULA field contains the Terms of Use / EULA URL above.
3. Subscription product still matches the in-app copy:
   - Product: `Vault OS Full Access Monthly Clean`
   - Duration: `1 month`
   - Price: `$99/month`
4. App Review Notes mention that the legal links are visible in the in-app subscription flow before purchase.
5. App Review Notes mention that account deletion is available at:
   - `Settings -> Account -> Delete Account`

These links were chosen specifically to avoid the broken `member.vaulttradingacademy.com` legal routes until that member-domain deploy issue is fully resolved.
