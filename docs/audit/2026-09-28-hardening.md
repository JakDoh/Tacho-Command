# Independent hardening candidate

Base: bb8d15ea9ae7c8ebf87a05d21e6e6961e727f0b1. Branch: audit/hardening-20260928.

Main and production are not deployment targets for this task. Golden 0.32c HTML and protocol command definitions remain unchanged. PR #91 is a source of individually reviewed components, not a replacement branch.

## Correction to audit F01

The operator reports two successful tests on 2026-09-28: connection and reading stopped as the wheels started moving. This is positive field evidence for the tested device/application combination. The audit must not describe the protection as nonfunctional. The precise 0.1 km/h threshold and whether the device or app initiates the disconnect remain unmeasured. Preserve the existing stationary guard and LIVE-to-card handoff. Validate any lifecycle change on hardware before promotion.

## Release conditions

No merge or production deployment is authorized by this branch. Candidate requires build, lint, typecheck, behavioral regression tests and a recorded Android/DTCO read, cancellation, disconnect, two-card, zone-change and update test. A preview must have no production bindings, routes or application secrets. Any unknown compatibility or legal interpretation stays explicitly unknown.

## Implemented scope

- Data integrity: null/empty/bool values remain unknown, a connection alone cannot confirm LIVE, samples expire after 30 seconds, malformed parser input is rejected before cutoff. Current UTC day ends at capture time, not midnight. UTC storage remains canonical; display uses historical phone-zone offsets and preserves elapsed time across DST. Calendar period needs every expected date.
- BLE lifecycle: unchanged stationary check, command definitions and retained-device LIVE handoff. Added bounded disconnect/abort propagation, setup-error cleanup and user cancellation. Wake lock reacquires when visible. Unexpected bridge errors leave the reading state safely.
- App: SR/EN/DE controls, explicit saved-card selection, saved-vs-LIVE labels, real processing/saving status rather than invented percentages, disconnect/cancel, support code, local deletion and CSV overview. History retains event markers, intervals and activity totals. No invented rule compliance verdict.
- Landing: direct beta entry, concrete compatibility boundary, pairing guide, privacy explanation and bounded feature claims in three languages. Install prompt is single-use; keyboard focus and Escape work in its fallback dialog.
- PWA: excludes API/admin/RSC responses, caches only shell/assets, deletes only own old caches, waits for explicit update and blocks it during communication. Existing manifest origin/id/start URL are retained.
- Backend: bounded streaming JSON, per-isolate abuse backstop, defensive cookie parsing, all-column schema readiness, daily telemetry/analytics retention job and framing/content headers. Preview deliberately has no database.
- Delivery: TypeScript failures resolved, typecheck gates in CI, build SHA in UI, exact-SHA manual production workflow. Separate fixed-name preview uses a fresh allowlist config without D1, routes, cron or application secrets.

## Validation and outstanding evidence

Automated regression suite covers protocol behavior, parser/persistence boundaries, current-day cutoff, DST elapsed duration, missing calendar dates, disconnect during transfer, API caching exclusion, malformed cookies and request-size/rate boundaries. UI tests render real React components instead of checking copy strings alone. The golden HTML SHA256 must remain `cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`.

Before promotion, record hardware/phone/browser/build and expected/actual outcomes for:

1. Existing successful stationary full read; same selected device handoff, no second chooser.
2. Movement protection in a controlled safe test with a second observer; confirm disconnect and no accepted partial read. Do not infer a numerical threshold from this result.
3. Device loss and Cancel during transfer: prompt error, no stuck progress, previous good snapshot intact, retry possible.
4. Background/foreground and screen wake lock; pending app update must not interrupt the read.
5. Card A then card B, reload, explicit saved selection, delete and CSV: no accidental identity mixing.
6. Berlin/UTC phone zones, local midnight, spring/fall DST, partial two-week history.
7. Installed Android PWA upgrade from the existing release, offline shell, API never served from cache.

Operational work cannot be certified from repository code: distributed Cloudflare rate limiting, alerting/retention job execution, operator/legal identity and lawful-basis review, other DTCO models, iPhone support, DDD signature validation and infringement engine. These remain explicit gates or unsupported features, not completed claims. The candidate UI needs visual/device review; automated SSR is not a substitute for mobile interaction testing.
