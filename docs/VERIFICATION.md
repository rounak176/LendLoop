# Verification — 5 November 2026

## Passed

- Lint, TypeScript checks, production build.
- 12 Convex simulation/security tests: core authorization and loan rules, notification privacy/read status, HMAC tampering/stale timestamps, HTTP replay, idempotent event/reminder receipts, stale claims, return-before-reminder completion, retry exhaustion.
- Deployment of backend functions/schema to development Convex.
- Local n8n custom node and encrypted credential import; request and daily workflows published; linked error workflow imported.
- Live Convex → HTTPS gateway → n8n → signed Convex callback: synthetic event sent on its first attempt.
- Live daily reminder workflow: first execution logged one synthetic overdue reminder; second execution logged none and skipped the already-completed reminder.
- Live duplicate completed event safely skipped; exact transport replay and tampered signature rejected. Expected negative-test failures appear in n8n and persisted failure records.
- Local n8n editor responds at localhost:5678; its port is bound to 127.0.0.1.

## Test data

The synthetic listing is inactive and hidden from the public board. Its synthetic loan was marked returned after verification. Audit events, one reminder receipt, and mock delivery records remain available for inspection. No real email or third-party message was sent.

## Runtime limits

- Delivery adapter is a durable mock log; no email/Slack/Discord provider is configured.
- Docker must remain running. The daily workflow runs at 09:00 Asia/Kolkata when n8n is available; no automatic catch-up for periods when the local computer is off.
- The development tunnel URL can change on restart/recreation. Run `node scripts/sync-webhook-url.mjs` after it changes.
- Workflow exports require `n8n/custom/` and credential binding. Secrets are omitted from exports.
- Production needs a stable endpoint, backups, retention/monitoring decisions, provider idempotency if real delivery is added, and deployment hardening.
- TypeScript passes with the real generated Convex API types. Base Web adoption is partial; native selects/tables remain.

See AUTOMATION.md for actual signed contracts, setup, credentials, and recovery.
