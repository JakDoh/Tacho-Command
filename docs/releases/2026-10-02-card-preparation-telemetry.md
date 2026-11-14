# Card preparation telemetry candidate — 2026-10-02

Baseline: `62220e78a161a6ec07e2f7cfdc5f651982cc4d00`, open free beta. This candidate is independent of documentation PR #106 and coverage/UI PR #107. It is not a deployed release or a hardware-verified correction of the first-attempt failure.

## Evidence and purpose

The owner reported that a first card-read action did not start, then reconnecting in the same app window allowed a complete read. The supplied admin screenshot confirms a completed 269-packet attempt; it does not establish the earlier failure's cause or prove an earlier error reached storage.

Source inspection shows card telemetry formerly began inside the controller bridge, after LIVE draining, stationary preflight and LIVE teardown. Failures before that point could therefore have no card attempt in admin. This candidate closes that reporting gap without guessing the hardware cause.

## Behavior

- Each accepted read-button action creates a fresh random session/TC identity before the LIVE availability gate. Busy/concurrent actions remain ignored by the existing guard.
- Automatic checkpoints identify preparation request, waiting for LIVE to finish, device validation, stationary check/confirmation, LIVE teardown and actual transfer start.
- The same identity continues into the existing card controller bridge. Retries create separate identities, so a later successful read does not erase the earlier attempt.
- Preparation failures emit a zero-packet terminal record. Only recognized operational messages map to specific codes; unknown failures retain their reported stage without a guessed physical cause. Free-form messages are not transmitted.
- Preparation cancellation is labelled separately from failure. Finalization is idempotent, and telemetry/network failure does not block card reading or UI completion.

Admin codes: `030` LIVE idle wait timed out; `031` LIVE close timeout/failure; `032` preparation cancelled; `033` LIVE device unavailable; `034` stationary state not confirmed. They describe observed signals, not a diagnosis of the tachograph.

The existing sanitized technical-event transport, retry queue and retention policy are reused. New event/phase/stage/code values are explicitly allow-listed. No driver/card/vehicle identity, raw payload, speed value or free-form exception text is added. No database migration, new secret or authentication change is required.

## Verification and release gate

Local build/artifact validation and 338 tests passed; TypeScript passed; lint had zero errors and the same two existing warnings. Regressions cover pre-transfer failure ingestion/admin classification, separate retry identities, continuation into transport, cancellation, duplicate finalization, unknown-text exclusion and unavailable diagnostics.

Golden HTML and protocol/transport modules, BLE commands, timing bounds, stationary guard, open-beta access and hosting configuration are unchanged. This improves visibility; it does not yet fix the first-attempt startup failure.

Deploy the client, ingress allow-lists and admin decoder together using the existing reviewed-SHA Cloudflare workflow. Until then the phone's current beta does not send these new preparation events. Do not weaken Cloudflare/admin authentication to inspect them.

For a stationary physical test, verify the exact deployed build, press Read card normally, and inspect admin afterward. A preparation failure should retain its own zero-packet row with stage/code; a subsequent successful retry should have a different TC code and its usual packet count. If every read succeeds, verify preparation checkpoints on the successful attempt; do not induce a driving-state failure. Actual delivery and hardware behavior remain to be verified. Previous unrecorded attempts cannot be reconstructed by this update.
