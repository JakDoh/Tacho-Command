# TachoCommand — Canonical Project State

Updated: **2026-10-01**. Reviewed application source: `62220e78a161a6ec07e2f7cfdc5f651982cc4d00` (`2026.09.30-beta.3`). This is a documentation checkpoint, not a new application release.

## Authority and identity

GitHub `main`, recorded field evidence and independently checked live behavior outrank chat memory or old candidates. Source establishes implementation; physical records establish only their tested combinations.

| Item | Source-backed state |
| --- | --- |
| Repository / integration | `canicboban-source/Tacho-Command` / `main` |
| Active app | `/app` and `/app-v2` render `AppV2Client` |
| Access | Open free beta; no signup/email confirmation, purchase or configured expiry |
| Version | `2026.09.30-beta.3` |
| PWA cache | `tachocommand-shell-v53-open-beta` |
| Card / transport labels | `parser-native-history-2026.09.19` / `golden-0.32c` |
| Production configuration | Independent Cloudflare Worker `tachocommand` |
| Storage binding | `DB`, database `tachocommand-prod` |
| Public origins | `tachocommand.com`; current Worker redirects `www` to apex |
| Admin | `admin.tachocommand.com`, authenticated APIs |

GitHub records show successful CI/quality and production deployment workflow for the reviewed source on 2026-09-30. No fresh live browser/API smoke or hardware run was performed in this documentation task. DNS, runtime secrets and infrastructure ownership are not proved by configuration alone.

The 2026-09-18 source-provenance hold is historical: PR #85 recorded App V2 source cutover, and current `/app` does not use the old recovery route. The [Sites incident](2026-09-19-sites-ownership-recovery.md) is preserved history, not today's hosting plan. Its old support-ticket resolution is not claimed.

## Golden 0.32c — permanently locked

**Closed decision:** preserve the proven Driver Card Slot 1 protocol. Do not edit, modernize, reformat or replace its immutable HTML reference. Preserve request bytes, credit flow, multipart sequence/ACK and completion gates. Protocol research requires a separate isolated candidate and cannot silently become production transport.

Reference: `docs/field-evidence/2026-09-16/TachoCommand-0.32c-driver-card-slot1-field-test.html`

SHA-256: `cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`

Original proof: DTCO 4.1a / GEN2 V2, Slot 1 TREP06, 269 submessages, 67,295 bytes, 61 TLV objects, positive transfer exit/communication stop and 56-day analysis coverage. The [App V2 proof](../field-evidence/2026-09-19-app-v2-card-field-proof.md) records the later equivalent physical path. Counts are sample-specific.

Current wrappers contain bounded setup/write/command waits, cancellation, five-second LIVE release settling, a 90-second first-packet bound and a 60-second no-new-packet bound. Older documents' 20-minute timeout describes their dated version, not current wrapper settings. This update changes none of them.

## Implemented product and boundaries

- LIVE: activity, continuous driving and cumulative break; optional daily/weekly values; refresh and stationary guard. Unknown values remain unknown. Previously confirmed snapshots and connection/freshness status are distinguished.
- Card: full Slot 1 download, packet/byte activity, cancellation, wake-lock request and disconnect handling. LIVE closes before card download; the selected device is reused. Automatic LIVE resumption is not implemented.
- History: up to 56 UTC calendar days, local-zone display, descending dates, timeline/list, totals and available card events. Interactive zoom/segment selection are not implemented.
- Periods: previous calendar week plus elapsed current week. Missing dates leave the aggregate unknown; within-day coverage is an open finding.
- Attention: standard driving-break screening only. No full rest/working-time/special-transport infringement engine or clean compliance verdict.
- Storage: failed reads retain the last good snapshot; unsaved successful reads remain exportable in memory. Restored identity is hidden until selection. Storage belongs to the browser profile, not separate accounts.
- CSV: UTC instants, local offsets, elapsed durations and read-start cutoff. No signed DDD export or signature/certificate validation.
- Languages: SR/EN/DE/RU/BG/RO/HU landing and app surfaces. Guide parity and native review are separate from dictionary presence.
- PWA: explicit updates, current-tab communication guard, own-cache cleanup and API/admin/RSC exclusion. Multi-tab/background/installed-upgrade behavior still needs mobile evidence.
- Support: restricted technical telemetry, offline retry, attempt-code lookup and authenticated admin. Analytics covers selected events, not a complete paid-conversion funnel.

Current policy: [open beta](../releases/2026-09-30-open-beta.md). Email access and 72-hour trial are historical. Disabled endpoints/modules and earlier records remain; no deletion without classification.

## Evidence and open findings

Strongest checked-in proof: DTCO 4.1a / Android Chrome / Slot 1. Owner-reported DTCO 4.1 success is additional feedback, not universal firmware certification. Future runs must record model/firmware, phone/browser, build and actual result. Stoneridge, iPhone/Safari and other combinations remain unconfirmed.

Synthetic source-review reproductions on 2026-10-01, **not fixed**:

1. `TC-DATA-01`: dates alone can mark a period complete despite unknown intervals inside days.
2. `TC-TIME-02`: distinct UTC intervals in the repeated winter hour project to identical local positions; the display cannot distinguish them.
3. `TC-EVENT-03`: removing unknown card-out activity can discard insertion/removal transitions.

See [review evidence and acceptance criteria](../audit/2026-10-01-source-review.md). These are not claims of failure on the owner's card.

Other limits: no continuous app-side speed measurement throughout download; no independently certified complete parser accuracy; nonconsecutive retained dates currently rejected; shared-browser card boundaries; no signed-file trust chain. Infrastructure/privacy/retention operation needs independent checks. [rc.1 notes](../releases/2026-09-30-rc-1.md) retain dated details, with their email/trial gates superseded by open beta.

## Privacy and support contract

- Card identity/history stays local unless an export is explicitly shared.
- Technical telemetry excludes driver/card/vehicle identity, location, device name, raw bytes and measured tachograph values.
- `TC-XXXXXX` support codes use secure randomness, never identity; one attempt retains one code.
- Product analytics uses random visit IDs and restricted events. Retention is 60 days technical / 90 days analytics; scheduled cleanup exists, but successful execution must be checked.
- Local technical diagnostic exports exclude card payload/identity. Diagnostic display mode is not server authorization.
- Restricted payloads do not establish blanket anonymity or completed privacy compliance. Legal pages remain drafts; operator details and privacy basis need completion/review before commercial release.

## Pairing evidence

A landing connection guide exists; not every language/firmware/menu path is field-verified.

Owner-verified 2026-09-18 DTCO 4.1a paths:

- ITS: `OK -> down x2 -> DRIVER 1 -> OK -> down x2 -> SETTINGS -> OK -> ITS DATA -> OK -> OK`.
- Pairing menu: `OK -> down x2 -> DRIVER 1 -> OK -> down x3 -> BLUETOOTH -> OK -> PAIRING`.

The [previous checkpoint version](https://github.com/canicboban-source/Tacho-Command/blob/62220e78a161a6ec07e2f7cfdc5f651982cc4d00/docs/project-state/TACHOCOMMAND-CANONICAL-STATE.md) preserves exact Serbian button wording and the VDO-manual continuation. Do not invent additional button counts or remove an existing pairing as routine onboarding. Refreshed guidance should use one action per line and recovery for invisible devices, ITS and Android permissions.

## Working and delivery rules

1. Start focused work from current `main`; one coherent task per PR.
2. Preserve golden protocol/reference and historical evidence. No destructive cleanup without classification.
3. Keep known/unknown, source-tested and hardware-tested status separate.
4. No invented activity, compatibility, progress percentage, current value or legal verdict.
5. Documentation/visual work must not change transport, timing, parsing, telemetry or legal interpretation.
6. Use the existing exact-reviewed-SHA Cloudflare workflow; independently confirm live build/APIs and required hardware results.
7. DNS, domains, secrets, database identity and access settings are separate work, unchanged here.
8. Documentation-only changes do not require production deployment.

Open drafts observed: #88 (older hosting preparation) and #91 (hardening against an older release branch). Neither is current source or an instruction to merge. Preserve pending classification. Earlier archived candidates remain historical evidence, not integration targets.

## Next work

First correct detailed-day integrity (`TC-DATA-01`, `TC-TIME-02`, `TC-EVENT-03`) without changing BLE transport; then activity contrast, zoom and segment details. Independent accuracy and release evidence precede payments/advertising expansion. Speed research is deferred.

The [roadmap](../product/TACHOCOMMAND-ROADMAP.md) proposes scope and gates; it does not certify implementation or promise a launch date.
