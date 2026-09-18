# Field-proven premium UI source reconciliation — 2026-09-18

## Status

This is a reconstruction candidate, not a claim that the original deployed source was recovered byte-for-byte.

The exact source snapshot behind the currently field-tested premium /app remains unavailable in visible GitHub history and in the accessible AppDeploy projects. The public production app and operator screenshots prove the product behavior, but not the original source provenance.

## Why this candidate exists

The current GitHub main still contains legacy /app recovery routing. The physically tested product instead exposes LIVE, Periodi, 56 dana, Pažnja, Kartica, real LIVE identity/tachograph state, real 56/56 card history and privacy-safe technical diagnostics.

To prevent continued visual/product work from living only in screenshots or an unversioned deployment, this branch adds a deterministic React/CSS reconstruction of the observed product shell.

## Safety boundary

The reconstruction is not wired to /app and is not deployed. It contains no Bluetooth/Web Bluetooth code, no DDP/UDS/TREP logic, no parser or compliance decisions, no telemetry write code and no personal field fixture. It accepts product data only through a typed state object.

The golden 0.32c transport artifact remains untouched.

## Visual baseline represented

1. LIVE — current activity, continuous driving, F99A and F99B.
2. Periodi — today, current week and 14-day context.
3. 56 dana — one-line daily activity timelines with DRIVE / WORK / AVAILABILITY / REST.
4. Pažnja — truth-first current attention state, explicitly not a legal verdict.
5. Kartica — minimal identity/status, 56/56 read state, locale and privacy-safe technical diagnostics.

Panel border thickness is centralized through --tc-panel-line so later visual refinement can be isolated and reviewed without touching behavior.

## Next gate

Before this source may replace the legacy /app route:

1. define the product-state adapter from the proven LIVE/card pipeline;
2. prove no change to golden 0.32c communication behavior;
3. prove card history and telemetry privacy boundaries;
4. compare the reconstructed UI against the field screenshots;
5. only then switch the route in a separate PR.

No production route or deployment changes are authorized by this candidate.
