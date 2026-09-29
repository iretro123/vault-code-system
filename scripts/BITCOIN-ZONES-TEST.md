# Bitcoin-only isolated test

## Running components (2026-09-19)

- `bitcoin-zone-server.mjs`: durable SQLite events, authenticated webhook on loopback 4180; separate authenticated administration/capture service on 4181.
- Cloudflare quick tunnel forwards ONLY 4180. This is temporary, not production hosting. Current base URL: `https://presented-lined-bag-pastor.trycloudflare.com`.
- `.vault-zones-state/credentials.json` contains generated webhook/admin capabilities, excluded from Git. Do not expose administration port 4181 or Vite through the tunnel.
- `bitcoin-capture-worker.cjs`: dedicated Chrome profile, polls pending captures. Requires user TradingView login and matching configured indicator charts. Rejects captures more than 60 seconds after the event. Displays actual capture timestamp.
- Vite proxies read-only feed/images to the private service. No webhook token reaches the browser.

## Not yet verified / enabled

1. Compile and save `vault-bitcoin-zones-test.pine` as a NEW private script; leave original indicator untouched.
2. Configure Coinbase BTCUSD 5m and 15m with that script in the capture browser. This test uses 24/7 crypto, never equity extended-hours settings.
3. Enable TEST webhook events in each chart's indicator settings. Create TradingView alerts on “Any alert() function call”, with the full capability webhook URL from the local credentials. TradingView requires 2FA. Do not put passwords in alerts.
4. Verify a real indicator-created event reaches SQLite, a matching chart is captured, and that capture displays in the local room. Verify entry, confirmed hold, and break independently. Unit tests are not proof of live delivery.
5. Confirm differences from original: close-confirmed BOS/zone creation; prior confirmed 15m bias; no buy/sell markers; no deleting a zone after a buy/sell signal; opposing zones not silently cleared. Initial active zones announce on first realtime update. “Holding” means first confirmed candle close after a price touch that has not crossed the invalidation boundary—not a promise of a bounce.

## Release restrictions

No member database credentials, push permissions, production chat endpoint, or publishing code exist in this service. It cannot publish to members. This Mac must stay awake with service/tunnel/capture browser running. Quick Tunnel URL changes after restart. Always-on hosting, retry/monitoring hardening, source verification, privacy and member access controls, and explicit production activation remain required.

## Evidence

31 unit tests passed; app TypeScript check passed. Public unauthenticated routes return 404; malformed authenticated webhook returns 400; private feed without token returns 401. No synthetic messages inserted into the active feed.

Cloudflare database creation through the connected account failed with authentication error; no Cloudflare database was created. Existing app/auth/push/database are untouched.
