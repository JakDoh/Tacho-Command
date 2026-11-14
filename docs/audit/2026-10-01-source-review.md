# TachoCommand source review — 2026-10-01

Application baseline: `62220e78a161a6ec07e2f7cfdc5f651982cc4d00` (`2026.09.30-beta.3`). Repository: `canicboban-source/Tacho-Command`.

**Review complete; findings remain open.** This documentation task implements no corrections. Reproductions used synthetic inputs, not an uploaded personal card or a new physical run.

## Scope and validation

Reviewed the active App V2 route/client/UI, golden-compatible card path, parser/normalization/local-time projection, snapshot storage, UTC break screening/CSV, telemetry/admin, PWA, release documents and deployment configuration. Open draft PR metadata was inspected; draft branch contents were not treated as current source. This is not an exhaustive security certification or proof for every hardware/firmware combination.

Local Node 24.19.0: build/artifact validation passed, 332/332 tests passed with no skips, TypeScript passed, ESLint had zero errors and two existing unused-variable warnings. GitHub CI/quality and production deployment workflow also succeeded for the application baseline on 2026-09-30. No new production smoke or hardware test was performed.

Golden HTML SHA-256 matched `cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`.

## TC-DATA-01 — date presence is not complete activity coverage

Files: `lib/app-v2-parser-card-adapter.js`, `lib/card-period.js`.

Reproduction: eight consecutive UTC dates, 2026-09-21 through 2026-09-28. Each contains rest 00:00–01:00, an unknown gap 01:00–02:00, driving 02:00–03:00, then rest. Normalize with a 2026-09-28T23:59:00Z cutoff and evaluate that period in UTC.

Observed: normalization accepts the record; `calendarCardPeriod` returns eight expected/available dates, `complete: true`, `minutes: 480`. Date presence and finite driving totals do not establish what occurred in the missing intervals. The UI's incomplete-period message is driven by this complete flag.

Acceptance: preserve known segments and their lower-bound sums, but distinguish unknown coverage from a complete aggregate. Check first/last local-day edges and current read cutoff without inventing missing time. Fully known ordinary data keeps its existing totals. Do not reject the entire valid download merely to conceal missing coverage.

## TC-TIME-02 — repeated DST hour overlays distinct intervals

Files: `lib/app-v2-phone-timeline.js`, `app/app/field-proven-premium-ui.tsx`.

Reproduction: 2026-10-25 UTC driving 00:00–01:00, work 01:00–02:00; project to Europe/Vienna after those intervals.

Observed: both become local 02:00–03:00, with 60 minutes each. State reports `timingComplete: true`. The fixed 1440-minute timeline draws both at the same left/width, and the sequence labels do not expose offset/order. The duration sums survive, but one plotted activity can cover the other. Current CSV already carries UTC/offset information and is not the source of this ambiguity.

Acceptance: distinguish repeated intervals by actual instant/order and offset, preserve elapsed totals and chronological order, and verify spring-forward gaps as well. No change to UTC card storage or break-analysis semantics.

## TC-EVENT-03 — unknown activity drops card transitions

Files: `lib/app-v2-canonical-card-parser.js`, `lib/app-v2-parser-card-adapter.js`.

Reproduction: a synthetic Gen2 TLV daily record for 2026-09-28, card inserted/rest at 00:00; card removed at 02:00 with unknown following activity; card inserted/work at 03:00. Read cutoff 12:00 UTC.

Observed: parser correctly omits unknown 02:00–03:00 activity. Normalization sees inserted rest followed by inserted work and produces `events: []`, losing removal/insertion transitions already present in the activity-change words.

Acceptance: preserve actual card-status transitions independently of whether the associated activity is known. Keep 02:00–03:00 unknown; never manufacture rest/work to recover an event. Check midnight/boundary deduplication.

## Product and operational observations

- Day details/totals already exist; zoom, segment selection and finer scale ticks do not. Current colors differ from the owner's proposed white/soft-blue/yellow palette.
- Scoped standard-break screening does not validate complete legal compliance. DDD signatures/certificates are not verified.
- Physical evidence supports its tested path; synthetic tests and a green build do not certify complete real-card accuracy or broad compatibility.
- Card download uses a separate session after stationary preflight; continuous app speed monitoring during it is not established.
- Browser-profile storage, cross-origin migration, multi-tab updates and background radio behavior require separate verification.
- Current analytics records selected usage events, not the owner's full try/return/pay hypothesis.
- README/canonical state previously described an obsolete manual pilot/provenance hold. This documentation refresh supersedes those descriptions while preserving dated field/release records.

Recommended next engineering package: detailed-day integrity, addressing these three findings without BLE changes. Follow with accessible contrast/zoom, independent comparison on authorized card data and the roadmap's release gates. No paid-release readiness or production change is certified here.
