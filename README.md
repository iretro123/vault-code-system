# Vault Code System

Vault Code System now runs from one shared React + Vite codebase for:

- Web (existing deployment flow)
- iOS (Capacitor wrapper)
- Android (Capacitor wrapper)

The native apps use the same `dist/` build artifacts as web, so feature parity stays aligned.

## Requirements

- Node.js + npm
- Xcode (for iOS)
- Android Studio (for Android)

## Install

```bash
npm install
```

## Web development

```bash
npm run dev
```

## Web production build

```bash
npm run build
```

## Mobile workflows (Capacitor)

### One-time platform setup

```bash
npm run cap:add:ios
npm run cap:add:android
```

### Sync latest web code into native projects

```bash
npm run cap:sync
```

### Run iOS simulator

```bash
npm run cap:run:ios
```

If this is your first Xcode install, accept the license once:

```bash
sudo xcodebuild -license accept
```

### Run Android emulator/device

```bash
npm run cap:run:android
```

## Added scripts

- `build:mobile`: Build web and copy assets to native projects
- `cap:sync`: Build web and sync all Capacitor platforms
- `cap:add:ios`: Add iOS native project
- `cap:add:android`: Add Android native project
- `cap:run:ios`: Sync then run iOS
- `cap:run:android`: Sync then run Android
