# TachoCommand — Canonical Project State

Updated: 2026-09-18

## Purpose

This document is the durable source-of-truth checkpoint for TachoCommand. GitHub `main`, golden field evidence, and verified production behavior outrank chat memory or abandoned candidate branches.

## Canonical repository state

- Repository: `canicboban-source/Tacho-Command`
- Default and only active integration branch: `main`
- Canonical `main` before this documentation refresh: `5eabb15b24c0e8f2a0049b786213fd7874d2fb97`
- Open pull requests after cleanup: **0**
- Historical branches are preserved as evidence/reference; they are not active integration lanes.
- Production is not to be overwritten from a historical branch or old candidate.

### Integrated and authoritative on main

- premium OLED landing and current public product claims;
- privacy-safe technical telemetry foundation;
- D1 telemetry storage schema and binding;
- field-test telemetry instrumentation;
- telemetry readiness endpoint;
- byte-exact golden 0.32c Driver Card Slot 1 field artifact;
- anonymous per-attempt support code `TC-XXXXXX` with indexed telemetry lookup;
- historical physical verification record from 2026-09-17.

## Golden 0.32c transport — permanently locked

**Closed decision:** the field-proven 0.32c Driver Card Slot 1 communication/transport path is the most valuable proven asset in TachoCommand and must not be changed again. Future product work must be built around it. If a future incompatibility appears, investigate adapters, detection, UI, recovery, diagnostics, or a separate experimental transport candidate first; do not mutate the golden 0.32c path itself. Any research that needs protocol experimentation must live in a separate isolated artifact/branch and can never silently replace the golden implementation.

Golden artifact:

`docs/field-evidence/2026-09-16/TachoCommand-0.32c-driver-card-slot1-field-test.html`

SHA-256:

`cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`

Proven physical result:

- Continental VDO DTCO 4.1a / GEN2 V2;
- direct Driver Card Slot 1 TREP 06;
- 269 transfer submessages;
- 67,295 bytes;
- 61 top-level TLV objects;
- positive RequestTransferExit;
- positive StopCommunication;
- full 56/56-day offline-analysis coverage.

Do not modernize, refactor, reformat, or reuse this artifact as an editable product source. New work must wrap around it or be implemented separately.

## Verified product behavior — 2026-09-18

Physical product verification now shows:

- LIVE values populated from the tachograph;
- current activity and continuous-driving context;
- F99A daily and F99B weekly values;
- Periodi with real current totals;
- 56/56-day card history rendered as activity timelines;
- Pažnja screen with no fabricated warning when no current warning exists;
- Kartica/status screen with successful card-read state;
- privacy-safe technical diagnostics;
- telemetry report received end-to-end without driver/card/vehicle/location/raw-data leakage.

The product has therefore moved beyond basic transport feasibility.

## Anonymous support code

Each new technical attempt may carry a support code in the form:

`TC-XXXXXX`

Rules:

- generated with secure randomness;
- ambiguity-free alphabet;
- no derivation from driver, card, vehicle, Bluetooth name, location, or tachograph values;
- one code reused for all telemetry events in one attempt;
- new attempt receives a new code;
- legacy telemetry without the code remains valid;
- D1 stores it in nullable `attempt_code` with an index for support lookup.

The internal UUID session ID remains internal and is not the support code shown to a user.

## Archived candidate work

The following old PRs were intentionally closed during the 2026-09-18 cleanup. Their branches remain preserved for evidence/reference; none is authoritative:

- PR #30 — 0.32a feasibility probe: superseded by golden 0.32c.
- PR #32 — 0.32b overview probe: superseded by golden 0.32c.
- PR #33 — parser v1: archived because audit reproduced a duplicate-minute overlap case; do not merge as-is.
- PR #34 — compliance v1: archived because it depends on the parser candidate and has intentionally incomplete rule scope.
- PR #36 — premium shell candidate: archived because it is older than the currently field-tested product UI and is not its authoritative source.

No historical branch was deleted during cleanup.

## Remaining provenance gap

The exact version-controlled source snapshot that produced the currently field-tested premium app UI is still not present in the visible GitHub `main` history.

The current repository `/app` code still contains legacy recovery routing, while the physically tested application shows the newer integrated LIVE / Periodi / 56 dana / Pažnja / Kartica product.

Therefore:

- do not deploy `main` over the working product until the exact production source is recovered or reconstructed and verified;
- do not treat archived PR #36 as that source;
- keep the production app unchanged while provenance is reconciled.

## Known non-transport hardening findings

These remain separate tasks and must not be mixed with the golden transport:

- legacy Worker `/app` interception versus the current premium app source;
- service-worker API caching/readiness behavior;
- service-worker cache cleanup scope;
- parser duplicate-minute invariant;
- STOP/cancellation semantics in the older read-only field-test client;
- independent retention execution rather than cleanup only on ingest;
- full release/deploy identity and rollback proof.

## Visual direction after source reconciliation

The current premium OLED direction is approved as the base.

Next visual refinements should be small and instrument-like:

- slightly thicker and clearer panel borders;
- stronger separation between primary and secondary surfaces;
- continuous-driving progress should visually transition **green -> yellow -> red** as the relevant threshold approaches;
- color must support, not replace, numeric time and text;
- no alarm-like red while values are safely far from the threshold;
- no change to protocol behavior, timing, parser semantics, telemetry privacy, or legal interpretation as part of a visual task.

Suggested visual semantics for the continuous-driving bar:

- early/safe range: green;
- approaching preventive zone: green-to-yellow;
- near the applicable limit: yellow-to-red;
- at/over a confirmed applicable threshold: red, accompanied by explicit text.

Exact transition points must come from the selected rule/profile logic rather than being hard-coded as legal conclusions in CSS.

## Working rules

1. `main` is the only active integration target.
2. Golden 0.32c is locked.
3. No destructive deletion without classification and evidence preservation.
4. Historical branches may remain as archives, but no parallel product work starts from them.
5. New feature work starts from current `main`.
6. One focused change per PR/task.
7. No production deploy until source/deploy provenance is explicit.
8. Privacy-safe telemetry never includes driver identity, card number, vehicle identity, location, full Bluetooth name, raw protocol bytes, or tachograph values.
9. Never fabricate history, current values, compatibility, warnings, or legal verdicts.
10. Visual polish must not alter transport, parser, telemetry, or compliance behavior.

## Pending product task — ultra-simple DTCO 4.1a phone pairing guide

Before public release, TachoCommand must include a literal, non-technical step-by-step guide for first-time phone pairing. The guide must be written for a driver who has never paired the tachograph before.

Physical DTCO 4.1a button sequence verified by the operator on 2026-09-18:

### 1. Enable ITS data

From the normal tachograph screen:

`OK -> ↓ x2 -> VOZAČ 1 -> OK -> ↓ x2 -> PODEŠAVANJA -> OK -> ITS PODACI -> OK -> OK`

Result: **ITS data enabled**.

This exact physical button count is now verified and may be used in the in-app guide.

### 2. Open Bluetooth pairing

From the normal tachograph screen:

`OK -> ↓ x2 -> VOZAČ 1 -> OK -> ↓ x3 -> BLUETOOTH -> OK -> PAIRING`

This sequence is physically verified up to the **PAIRING** menu.

After the PAIRING screen, continue the guide only with physically verified steps. Do not guess the next OK/button count from memory.

### 3. What "Geräte verwalten" means

German `Geräte verwalten` = **Upravljanje uređajima**; in this context: **Upravljanje Bluetooth uređajima**.

According to the VDO DTCO 4.1a manual, this menu is for already paired devices. Pressing OK shows paired device names, ▲ / ▼ browses them, and selecting one leads to an `entfernen? Nein` (remove? No) prompt. It is therefore not the normal pairing step.

If the operator's phone is already listed here, treat that as evidence that Android-level pairing already exists. Do not remove it during normal onboarding.

VDO also marks this management menu as available from DTCO 4.1a and requiring a company or workshop card.

### 4. Official VDO continuation for pairing

For a new phone pairing, use the separate Driver 1 Bluetooth pairing path.

After:
`OK -> ↓ x2 -> VOZAČ 1 -> OK -> ↓ x3 -> BLUETOOTH -> OK -> PAIRING`

continue as follows:

1. Press **OK** on `PAIRING / Koppelung`.
2. The DTCO displays `Bitte verbinden` (Please connect).
3. On the phone, open Bluetooth and select the DTCO 4.1x.
4. A 6-digit PIN appears on both the phone and the tachograph.
5. Confirm that both PINs are identical.
6. Confirm `Pair / Koppeln` on the phone.
7. On DTCO 4.1a, press **↓** to confirm the displayed `Ja`.
8. Press **OK** to finish pairing.
9. The DTCO displays `Eingabe gespeichert` (entry saved).
10. The Bluetooth symbol appears in the top line of the standard display.

VDO notes that removing the driver card makes Bluetooth inactive and reinserting the driver card makes it active again.

Only after Android-level pairing succeeds should TachoCommand attempt Web Bluetooth connection.

The final in-app wording must stay literal, one action per line, for example:

`Pritisni OK.`
`Pritisni strelicu dole 2 puta.`
`Na ekranu piše VOZAČ 1.`
`Pritisni OK.`

Do not compress these into technical menu paths for the normal driver-facing guide.

Also include a recovery branch:
- if the phone does not see the tachograph;
- if ITS data permission is not enabled;
- if Android Nearby devices/Bluetooth permission is denied;
- if pairing already exists but Web Bluetooth does not list the device.

This onboarding task is UI/help only and must not alter the golden 0.32c transport.

