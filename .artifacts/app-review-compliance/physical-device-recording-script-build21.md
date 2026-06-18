# Vault OS Physical Device Recording Script For Apple Review

Use a real iPhone or iPad. Record in one continuous take if possible.

Build target:
- `1.0 (21)`

## Account to use

Recommended:
- Create a fresh disposable account inside the app during the recording.

Why:
- Apple specifically asked to see account creation or sign-in plus the full deletion flow.
- A fresh account makes the final failed sign-in proof clearer.

## Recording steps

1. Launch Vault OS.

2. If already signed in, sign out first so the recording starts from a clean state.

3. Show account creation or sign in with a test account.
   - If creating a new account, complete the basic account creation flow in-app.

4. After account access is active, navigate to the subscription/paywall screen.

5. Pause long enough for Apple to clearly see all of the following on the subscription screen:
   - subscription title/name
   - subscription price
   - subscription duration
   - `Terms of Use (EULA)` link
   - `Privacy Policy` link

6. Tap `Terms of Use (EULA)` and show that it opens.
   - Expected URL:
     - `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
   - Return to the app.

7. Tap `Privacy Policy` and show that it opens.
   - Expected URL:
     - `https://raw.githubusercontent.com/iretro123/vault-code-system/main/public-legal/privacy-policy.md`
   - Return to the app.

8. Navigate to:
   - `Settings -> Account -> Delete Account`

9. Pause on the delete screen so Apple can clearly see:
   - the `Delete My Account` button
   - the warning text that deletion is permanent

10. Start the deletion flow.

11. Type `DELETE` when prompted.

12. Confirm deletion.

13. Pause on the success state/message so Apple can clearly see that deletion completed.

14. Show that the app signs the user out automatically.

15. Attempt to sign back in with the same deleted account credentials.

16. Show that the deleted account no longer works or is no longer accessible.

## Notes to include in App Review

Suggested summary:

`We updated the subscription purchase flow to display the subscription title, duration, price, Privacy Policy link, and Terms of Use/EULA link before purchase. We also added an in-app account deletion flow under Settings -> Account -> Delete Account. The attached physical-device recording shows sign-in/account creation, the subscription legal links, navigation to account deletion, confirmation, successful deletion, automatic sign-out, and failed access using the deleted account.`
