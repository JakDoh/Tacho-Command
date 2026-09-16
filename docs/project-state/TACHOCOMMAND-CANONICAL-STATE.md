# TachoCommand — Canonical Project State

Updated: 2026-09-16

## Purpose

This document is the durable handoff and source-of-truth checkpoint for ongoing TachoCommand product work. Chat history or account memory must not be treated as the only project state.

## Source-of-truth order

1. GitHub repository and merged `main` history.
2. This canonical project-state document for current decisions, open gaps and deployment provenance.
3. Verified field-test evidence and current production/staging behavior.
4. Chat/account memory only as supporting context.

If any of these disagree, stop and reconcile before mutating production.

## Current GitHub baseline

- Repository: `canicboban-source/Tacho-Command`
- Default branch: `main`
- Current known `main` baseline after landing merge: `022f9d845b4e981c8cea60b1420d6a97bf05878c`
- PR #35 premium OLED landing: merged.
- PR #33 deterministic driver-card parser v1: open draft.
- PR #34 driver safety/compliance engine v1: open draft, stacked on #33.
- Older BLE/DDP probe PRs remain historical development evidence and are not the current product UX plan.

## Proven field capability

The project has already moved beyond protocol feasibility.

Verified product evidence includes:

- successful Smart Tacho V2 / VDO DTCO 4.1a driver-card download on slot 1;
- 269 transfer submessages;
- 67,295-byte payload;
- 61 top-level TLV objects in private validation;
- 217 daily records;
- full 56/56-day history window available in the validated field sample;
- live read-only RDBI path previously proven on the physical setup.

Do not return the roadmap to 0.32a/0.32b feasibility work unless new evidence specifically requires protocol regression analysis.

## Current public/product state reported and verified by operator

The latest app iteration is referred to as **v37** in the working history.

Operator-verified behavior/state:

- one-time technical-diagnostics acknowledgement screen;
- minimal anonymous connection telemetry;
- connection/GATT/read timing, timeout, NRC, disconnect and failure-phase telemetry;
- normalized tachograph-family reporting rather than full Bluetooth device name;
- no card values, raw bytes, driver identity, vehicle identity or location in telemetry;
- automatic technical-event retention target: 60 days;
- app is currently intentionally open to anyone who has the link while product quality is being completed;
- production telemetry still needs one full physical end-to-end verification against a tachograph;
- all six public email addresses have been created through Porkbun and are working:
  - `info@tachocommand.com`
  - `support@tachocommand.com`
  - `privacy@tachocommand.com`
  - `security@tachocommand.com`
  - `billing@tachocommand.com`
  - `sales@tachocommand.com`

### Important provenance gap

The currently visible GitHub `main` `/app` source still reflects the older recovery/field-test routing model. The operator-verified v37 app state therefore must be reconciled with its authoritative deployment/source before production UI work is merged.

Do **not** overwrite production from an older repo snapshot merely because it is present on `main`.

## Premium product direction

Primary product goal now: **premium professional driver experience**, not further protocol discovery.

Target feel:

- calm, precise, premium OLED cockpit;
- “Swiss instrument” hierarchy rather than dashboard clutter;
- truth-first empty states, never fake values;
- immediate clarity for a working driver on a phone;
- privacy boundary visible but not noisy;
- warnings separated from legal conclusions;
- every LIVE metric can explain what it means and where it comes from;
- real product screenshots only when the production UI actually exists.

## Premium app information architecture

Persistent primary navigation:

1. `LIVE`
2. `Periodi`
3. `56 dana`
4. `Pažnja`
5. `Kartica`

### LIVE

- connection status;
- current activity;
- continuous driving;
- cumulative break / next-break context;
- daily driving;
- weekly driving;
- last successful read;
- tap/click explanation for every metric;
- truthful unavailable state when no physical value is present.

### Periodi

- Today;
- current week;
- 14 days;
- only populated from genuine parsed/live data.

### 56 dana

- real driver-card history only;
- DRIVING / WORK / AVAILABILITY / REST timeline;
- no synthetic calendar rows or demo activity data.

### Pažnja

Keep separate:

- preventive warning;
- reached limit;
- event requiring legal/profile review.

Do not present unsupported legal verdicts.

### Kartica

- show only reliable identity/status metadata;
- do not expose full card number in normal product UI;
- show validity/read status when reliably parsed;
- preserve privacy-first product language.

## Premium UI preview

A separate non-production AppDeploy preview was created solely for visual/product review:

- App: `TachoCommand Premium App Preview`
- App ID: `tachocommand-premium-app-preview-nxwn0l`
- URL: `https://tachocommand-premium-app-preview-nxwn0l.v2.appdeploy.ai/`
- BLE calls intentionally disabled.
- No fake tachograph/card values.
- Includes working navigation, truthful empty states, metric explanation sheets and a staged connection-flow preview.

This preview is design evidence, not production source-of-truth and not a replacement for the v37 implementation.

## Immediate next work

### Gate 1 — reconcile authoritative v37 source

Before integrating the premium shell:

- identify the exact source/deployment snapshot that produced the operator-verified v37 app;
- compare it with current GitHub `main`;
- preserve telemetry, privacy and working hardware flows;
- bring the authoritative production implementation back under version-controlled provenance.

### Gate 2 — premium app shell integration

After Gate 1:

- port the approved premium information architecture into the authoritative app source;
- preserve hardware/protocol behavior unchanged unless a separate evidence-backed task requires it;
- keep LIVE values data-driven;
- keep empty states truthful;
- preserve mobile-first behavior.

### Gate 3 — telemetry physical proof

At the next physical tachograph session verify one real path end-to-end:

`connect_start -> gatt_connected -> transport -> TesterPresent -> F923/F925/F903/F99A/F99B -> snapshot_complete`

Verify that stored telemetry does not contain private driver/card/vehicle/location values.

### Gate 4 — product completion

Then finish:

- Periodi;
- 56-day production UI;
- Pažnja;
- Kartica;
- connection/recovery UX;
- licensing/access control;
- payment;
- final security/product audit;
- final landing refresh using real production screenshots.

## Working rules

- One primary engineering lane/account at a time.
- No parallel code mutation from another chat/account without a documented handoff.
- GitHub/project-state document wins over chat memory.
- Small evidence-backed changes only.
- Do not trade protocol correctness or privacy for visual polish.
- Do not fabricate history, current values, legal verdicts or compatibility.
- Keep production open during the current product-hardening phase only as an explicit temporary decision; access/licensing is a later gated task.
- No destructive production action without explicit verification of target and rollback/provenance.
