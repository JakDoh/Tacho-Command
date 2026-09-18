# TachoCommand — Physical field verification — 2026-09-17

## Scope

This note records the operator-observed physical test performed against the installed TachoCommand production app on 2026-09-17. It is evidence only; it does not claim deployment provenance that has not been independently reconciled.

## Physical LIVE result

**LIVE RDBI path: PASS.**

Observed in the installed app while connected to the physical tachograph:

- tachograph shown as `DTCO-W-5065LO`;
- slot shown as `Vozač 1 · Slot 1`;
- current activity shown as `ODMOR`;
- F923 continuous driving shown as `0 h 22 min`;
- F99A current daily driving shown as `0 h 22 min`;
- F99B current weekly driving shown as `14 h 09 min`;
- F925 cumulative break shown as `0 h 06 min`;
- app displayed `LIVE podaci su potvrđeni sa tahografa.`

This proves the installed app can still obtain and render the previously proven LIVE tachograph values on the physical setup used for the test.

## Card / product navigation result

**Card/product navigation: NOT COMPLETE in the tested installed app.**

Operator observed that the bottom navigation items other than LIVE did not provide working product flows during this session:

- Periodi;
- 56 dana;
- Pažnja;
- Kartica.

The LIVE screen displayed `Kartica još nije očitana`. No card-download action was available from the tested product UI, so this session did not re-prove card download or the 56-day UI.

Previously recorded driver-card download evidence remains historical proof and must not be replaced by assumptions from this test.

## Technical diagnostics acknowledgement

The one-time technical-diagnostics acknowledgement had already been accepted by the operator during the previous night's test. On this run the acknowledgement screen appeared only briefly before the app continued into the cockpit. Treat this as a UI/provenance observation, not as a consent failure, unless a clean-install test later proves otherwise.

## Telemetry result

**Automatic telemetry email: FAIL / not observed.**

No automatic telemetry email arrived after the physical LIVE session.

**D1 persistence: UNVERIFIED.**

The repository now contains the privacy-safe telemetry contract, D1 schema/migration, `DB` binding configuration, POST ingestion path, client instrumentation on the field-test candidate, and a read-only readiness endpoint. However, this physical session did not independently prove that the installed production app posted this session into the repository-defined D1 path.

Do not infer D1 persistence from the successful LIVE UI alone.

## Production/source provenance

The installed production app shown during the field test has a premium LIVE cockpit and bottom navigation that do not match the current `main` `/app` recovery redirect implementation. This confirms that the documented production/source provenance gap remains open.

The repository branch `feat/premium-driver-app-shell-20260916` contains a premium five-tab shell, but that branch uses truthful empty/demo-free UI state and does not by itself prove that it is the exact source deployed in the installed production app that produced the physical LIVE values.

Do not overwrite production from `main` or the premium shell branch until the deployed source/version is identified and reconciled.

## Field verdict

`FIELD TEST — PARTIAL PASS`

- LIVE physical RDBI: **PASS**
- production premium cockpit rendering real LIVE values: **PASS**
- non-LIVE product navigation: **NOT COMPLETE / FAIL for this session**
- driver-card read from production UI: **NOT TESTED / unavailable in UI**
- automatic telemetry email: **FAIL / not received**
- D1 telemetry persistence: **UNVERIFIED**
- production/source provenance: **OPEN**

## Next safe work

1. Reconcile the authoritative deployed production source/version before any production overwrite.
2. Verify the actual production D1 binding/table and confirm whether this physical session created privacy-safe telemetry rows.
3. Implement or restore the agreed automatic telemetry email path without exposing card, driver, vehicle, location, Bluetooth-name, raw-byte, or actual tachograph values.
4. Integrate working Periodi / 56 dana / Pažnja / Kartica flows only after source provenance is closed, preserving the proven LIVE BLE/RDBI behavior unchanged.
