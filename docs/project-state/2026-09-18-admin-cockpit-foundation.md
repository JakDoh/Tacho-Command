# Admin cockpit foundation — 2026-09-18

## Goal

Provide a private, read-only product cockpit that can later be bound to `admin.tachocommand.com`.

## Security boundary

The admin surface does not trust a hidden URL. Sensitive aggregate APIs require a signed HttpOnly admin session.

Required deployment secrets:

- `ADMIN_ACCESS_KEY` — high-entropy admin login key, minimum 24 characters.
- `ADMIN_SIGNING_SECRET` — independent high-entropy HMAC signing secret.

The session cookie is:

- HttpOnly
- Secure
- SameSite=Strict
- 12-hour maximum lifetime

The route is also marked `noindex, nofollow, noimageindex`.

The application now treats `admin.tachocommand.com` as the canonical production admin hostname. The root of that hostname redirects to `/admin`, while `/admin` and `/api/admin/*` return no admin surface on other production hosts. Localhost is permitted only in non-production development for testing.

DNS/custom-domain activation is still a deployment operation and is intentionally not implied by the code change. Once the production hosting target is confirmed, `admin.tachocommand.com` should be pointed at that exact deployment and protected by an edge identity gate such as Cloudflare Access in addition to the application-level session.

## Read-only overview

The admin API returns only aggregate counts for the last 30 days:

- anonymous browser sessions,
- landing views,
- app opens,
- demo lifecycle,
- open-app and guide clicks,
- coarse traffic-source categories,
- language distribution,
- technical read-attempt counts,
- technical outcome counts,
- 14-day landing/app daily series.

It does not return visit IDs, session IDs, attempt codes, driver/card/vehicle identity, location, raw tachograph data, IP addresses, user-agent strings, or full referrer URLs.

## Explicitly unchanged

- Golden 0.32c transport
- BLE/DDP/UDS/TREP
- card parser
- telemetry event contracts
- legal-rule logic
- routing/deployment
