# Vault OS iOS Release Checklist

Last updated: 2026-05-16

## Current status

- GitHub `main` is current with the iOS release and notification fixes.
- App Store Connect app record exists:
  - `Vault OS: Trading Academy`
- iOS build `1.0 (1)` has been uploaded to TestFlight and is processing.
- APNs notifications have been validated on a real iPhone in development testing.

## Draft App Store metadata

These are safe draft values to use as the first pass in App Store Connect.

### App name

- `Vault OS: Trading Academy`

### Subtitle

- `Trading community, coaching, and execution`

### Promotional text

- `Stay connected to your trading community with live alerts, course progress, session updates, and real-time community notifications.`

### Description

`Vault OS is a trading academy app built to help members stay focused, accountable, and connected throughout the trading week.

Inside the app, members can follow the academy playbook, work through structured courses, track progress, join community discussions, review signals and wins, stay on top of live sessions, and receive real-time notifications when important activity happens.

Vault OS is designed to support daily execution, not just passive learning. Members can check in, follow their next step, stay aligned with the weekly game plan, and keep up with the academy from anywhere.

Features include:

- Real-time community updates and mention notifications
- Structured trading courses and lesson progress tracking
- Academy playbook and onboarding flow
- Live session scheduling and alerts
- Signals, wins, and community discussion rooms
- Admin announcements and motivation notifications
- Member profile, progress, and accountability tools

Vault OS is intended for academy members and learners who want a smoother mobile experience with fast access to the academy’s content, coaching, and community.`

### Keywords

- `trading,academy,community,signals,education,stocks,options,mentorship,playbook,finance`

## App Store Connect items still needing completion

### Required content

- Upload iPhone screenshots
- Fill Support URL
- Fill Privacy Policy URL
- Fill Copyright
- Select the uploaded build once processing finishes
- Complete App Review contact details
- Provide review login credentials and notes
- Complete App Privacy answers
- Confirm Pricing and Availability

### Optional but recommended

- Marketing URL
- Promotional text polish
- Final review notes that explain the member login flow

## Screenshot plan

Recommended first screenshot set:

1. Home dashboard
2. Community chat
3. Learn / Courses
4. Live sessions
5. Playbook or progress screen

Preferred device size for App Store:

- iPhone 6.5" display set

## Release QA before public submission

Run this from the TestFlight build, not just the debug build:

1. Sign in
2. Home dashboard loads correctly
3. Community chat works and emoji picker renders correctly
4. Keyboard behavior is smooth
5. Bottom navigation stays fixed
6. No horizontal drift on key screens
7. Notification permission is enabled
8. `@mention` sends exactly one push
9. `@everyone` sends exactly one push
10. `live_now` opens the correct destination
11. `announcement` opens the correct destination
12. `new_module` opens the correct destination
13. No duplicate notifications for the same event

## Known remaining launch dependency

The uploaded build is still processing in TestFlight. After processing finishes:

1. Attach the build in the iOS App Version page
2. Create an internal testing group if needed
3. Install the TestFlight build on the real iPhone
4. Run the release QA above
5. Submit for review
