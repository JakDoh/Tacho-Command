# Terminal card reports and readable day timeline — 2026-10-02

## Field evidence and cause

Three successful reads displayed saved card data while the admin had only a progress checkpoint:

- TC-NHNH48: admin 260 packets; app 269 saved.
- TC-UWCFFV: admin 260 packets; app 269 saved.
- TC-TPRH5G: admin 490 packets; app 491 saved, 123.2 KB.

The telemetry ingress used a single multi-row Drizzle INSERT. Actual generated SQL for the prepared final report has 135 bound parameters (9 events with nullable fields); D1 permits at most 100 parameters per statement. Single-event progress posts fit. The ingress caught the insert failure as `storage_unavailable`; local delivery retries used the same oversized insert. This is a reproduced storage defect consistent with the field pattern, not a production log inspection. The earlier hypothesis about the client dropping the terminal event at its 20-event batch cap was incorrect.

Sources: https://developers.cloudflare.com/d1/platform/limits/ and https://developers.cloudflare.com/d1/worker-api/d1-database/#batch

The fix uses one insert per sanitized event in a single atomic D1 batch, with the existing retention cleanup first. Acknowledgement follows successful completion of the entire batch. No schema, privacy fields, rate limits, consent, or client retry changes are required. Pending reports may recover when the existing queue flush runs, if they remain on that phone. Historical absent reports are not marked successful without receiving a terminal event.

Regression checks compile the actual storage helper and database schema, execute the real Drizzle SQL through SQLite with D1's 100-parameter bound, and verify successful 269/491-packet final reports, the maximum 20-event batch, and rollback on a failed write. Field verification of recovered admin completion is still required.

## Day detail

- Driving: white; work: soft yellow; rest: soft blue; availability: lavender.
- Different activity heights, explicit legend, hourly ruler.
- 1×, 2×, 4× and 8× zoom with horizontal scrolling; quarter-hour ticks at 4× and 8×.
- Tap or keyboard-select an activity for exact displayed local start/end and recorded minutes.
- Existing local-time ambiguity and incomplete-coverage notices stay visible. No interpolation of missing activities, speed or distance.
- All seven app locales have localized zoom controls and activity names.

The golden 0.32c BLE/card protocol, timing, stationary gates and parsing are unchanged. This package does not resolve intermittent pre-read stationary validation.

## Validation

349 tests pass; typecheck and production Cloudflare build pass. Lint has no errors and the two existing unused-variable warnings. The browser preview could not be opened because the cloud browser blocks local file URLs; visual field verification remains necessary.
