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

## Review result

Draft PR: https://github.com/canicboban-source/Tacho-Command/pull/96

Isolated preview: https://tachocommand-audit-preview.canicboban.workers.dev/

GitHub CI, quality gates and isolated preview deployment passed on the first candidate (274 tests, typecheck and build). Browser verification confirmed landing rendering, app entry, German language selection and the empty history state. Visual review caught and corrected CTA contrast, desktop hero alignment and the unknown-activity color. Follow-up commits must pass the same CI before review. Mobile hardware, real card data interaction and installed-PWA upgrade remain unverified.


## 2026-09-29: zero-packet field diagnostic candidate

User reports card recognition followed by zero packets while Bluetooth stays connected, on both prior and preview builds. Cancel disconnects. This does not establish a protocol or firmware incompatibility.

Candidate `2026.09.29-diagnostic.1` adds a 90-second absolute first-card-packet deadline, unaffected by response-pending messages. After the first data packet, existing idle handling applies. Transport diagnostics show stage, last confirmed stage, bounded error code, event elapsed time and pending count in the UI, retained after failure. No card contents or identity are included. Diagnostics are local UI evidence; the isolated preview has no telemetry database.

The deadline is an experimental operational bound, not a manufacturer specification or a fix for the underlying no-data cause. Bluetooth setup and teardown retain their existing behavior. Three-second LIVE handoff and protocol command bytes remain unchanged. Main, production and golden HTML remain unchanged. Field retest is required before release.


## Diagnostic candidate 2: five-second handoff experiment

`2026.09.29-diagnostic.2` changes only the LIVE-to-card settling delay from 3 to 5 seconds and makes receive-credit write failures visible as `credit_write_failed`, terminating the failed transport instead of silently waiting. Protocol request bytes and first-packet deadline remain unchanged. Five seconds is an experimental value, not an established device requirement. The field evidence includes one completed 269-packet read and subsequent zero-packet reads with one pending response, including an automatic first-packet timeout. Neither company remote download nor handoff timing is a proven cause.


## Diagnostic candidate 3: prevent late LIVE teardown crossing sessions

Code inspection found that the outer 1.5-second close timeout previously allowed handoff to continue while the old close operation could still await its write queue and later disconnect the same BluetoothDevice. LIVE close now has a 1-second internal deadline, shares one close promise, seals queued writes on completion or failure and disconnects exactly once. A failed close rejects; the outer deadline also rejects instead of proceeding to card read. UI retains `live_close_timeout` or `live_close_failed` with stage `live_teardown`. Five-second settling and card command bytes remain unchanged.

A regression test deliberately delays the final credit write beyond the close deadline, reconnects, then releases the old write; the successor is not disconnected. Another test verifies a rejected close write is surfaced. This is a demonstrated code race, not proof of the physical zero-packet cause. In particular, a zero-packet attempt without a disconnect cannot be attributed to this race from current evidence. Successful and failed field transfers both had one response-pending reply. Further investigation of receive credits and ignored/partial protocol responses remains necessary if stalls persist.


## Diagnostic candidate 4: bounded no-progress wait and technical trace

First-packet wait remains 90 seconds. After a complete card submessage, an absolute 60-second no-new-card-packet timer starts; pending responses and partial notifications do not reset it. UI refreshes diagnostic ages once per second, shows a waiting notice after 10 seconds without a new card packet, and retains `packet_idle_timeout` on expiry. GATT writes have a 7-second deadline; expired/failed writes seal their queue to prevent later queued writes from running. This bounds an otherwise unresolved write promise as well as the transfer wait. Error display precedes best-effort teardown, which can take additional time.

Local trace includes stage milestones, last 256 events, dropped-event count, FIFO fragment sequence/total/length, DDP SID and negative-response code, receive-credit and command write start/complete/failure, available transmit credits, ACK requested/written counters, queue depth, notification/packet ages and GATT status captured at failure. LIVE close/settle timings accompany transport diagnostics. ACK written means the browser write completed, not that the tachograph processed it. Partial count is a cumulative count of notifications awaiting assembly, not a count of lost packets. No card payload, identity, device name or arbitrary exception messages are exported. `Download diagnostics` exports JSON with build and attempt code from the current UI; no new backend logging or automatic transmission.

Tests cover a stalled transfer despite repeated pending replies, an unresolved ACK write, bounded trace storage, identity/payload exclusion and rendered diagnostic export control. Existing full-transfer and first-packet timeout tests remain applicable. This candidate improves localization of the fault, not a claim that physical transfer stability is fixed.

### 2026-09-29 — breaks.1 historical driving-break screening

Replaced the Attention placeholder with a deliberately scoped standard Article 7
check (45 minutes or >=15 followed by >=30; accumulated driving >270 minutes).
Source: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02006R0561-20240522
This is not a full infringement engine: special passenger/transport regimes,
working-time, daily and weekly rest checks are explicitly excluded in all three
languages. Findings are also surfaced on the overview; absence of findings is
never presented as a clean compliance verdict.

Adjacent rest fragments are accumulated; work/availability and midnight do not
reset driving. Gaps reset inference and mark incomplete coverage. Ambiguous local
time overlaps/duration mismatches are skipped, rather than manufacturing a DST
finding. The first observed period is a lower bound, not proof of a preceding
rest. Analysis is derived from the displayed card, without changing stored data
or Bluetooth transport. No uploaded driver file is committed.

Local validation against the supplied CSV found 277, 272 and 301 driving minutes
in the three flagged periods, including the user-reported September 21 case.
Synthetic regression tests cover split-break order, exact limit, short stops,
rest fragments, midnight, gaps and overlap. Firmware/protocol unchanged.
