# iOS Push Notifications

This app has native iOS push delivery wired through Capacitor and Supabase.

## Push Types

| Type | Trigger | What the user sees | Tap destination |
| --- | --- | --- | --- |
| `mention` | Another member mentions the user or `@everyone` in community chat | Banner with the sender name and a short preview of the message | `/academy/community` |
| `rz_message` | CEO/RZ posts a new community message | Banner with the room title and the message preview | `/academy/community` |
| `live_now` | Admin starts a live session | Banner saying the academy is live now | `/academy/live` |
| `announcement` | Admin sends a push-style announcement | Banner with the announcement title and summary | `/academy/room/announcements` |
| `new_module` | Admin sends a new module announcement | Banner with the module title and supporting copy | `/academy/learn` |
| `motivation` | Admin sends a motivation push | Banner with the title and short motivational copy | `/academy/community` |

## iPhone Experience

- When the app is closed or in the background, iOS shows a native push banner on the lock screen and in Notification Center.
- When the app is open, Capacitor is configured to present the notification with alert, sound, and badge behavior instead of silently swallowing it.
- Tapping a push opens the app and routes the user to the matching screen using the notification `link_path`.
- `live_now` and `announcement` also trigger a stronger haptic when received while the app is open.

## Release Checklist

Code is ready for iOS push, but release still depends on Apple and Supabase configuration:

1. Enable the Push Notifications capability for the release signing profile in Xcode and Apple Developer.
2. Use a production APNs setup for the App Store build.
3. Set Supabase secrets:
   - `PUSH_WEBHOOK_SECRET`
   - `APNS_KEY_ID`
   - `APNS_TEAM_ID`
   - `APNS_PRIVATE_KEY`
   - `APNS_BUNDLE_ID`
4. Test on a physical iPhone before App Store submission.
