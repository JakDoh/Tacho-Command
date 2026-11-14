# Card coverage and standard-break candidate — 2026-10-01

Application baseline: `62220e78a161a6ec07e2f7cfdc5f651982cc4d00`, open free beta. This document describes the candidate branch, not a deployed release or a new hardware result.

## Changes

- `TC-DATA-01`: complete dates alone no longer certify the previous-calendar-week/current-week driving total. Every local day must have known activity continuously from its actual local start through its end or the read cutoff. Unknown coverage leaves the aggregate unconfirmed; known daily segments/minutes remain visible.
- UTC adapter aggregates use the same continuous-coverage requirement. Local display coverage handles 23-hour/25-hour DST days using UTC instants; existing wall-clock overlap finding `TC-TIME-02` is not fixed here.
- Day details show the existing localized incomplete-data explanation. Standard-break screening also reports missing leading/trailing activity, while preserving findings that follow from known recorded driving.
- Confirmed standard driving-break exceedances and their navigation notice are red, with explicit excess minutes. A subsequent qualifying break does not remove a previous finding.
- Standard scope remains Article 7: 45 continuous minutes, or at least 15 followed by at least 30. Short separate stops are not added across work/driving. Daily/weekly driving limits, daily/weekly rest and special passenger regimes are not newly implemented.

Golden 0.32c reference, BLE commands, transport timeouts, card download, open-beta access, telemetry and hosting settings are unchanged. There are no storage migrations; coverage is recomputed from saved canonical activity when displayed.

## Acceptance evidence

Regression cases cover internal gaps despite all dates being present; complete days clipped at read start; a missing prior UTC edge in the phone's local day; both DST changes; absent coverage metadata; known-duration preservation; 15+30 and 20+30; rejected 20+25, 14+31 and reversed 30+15; separate short stops; the exact 270-minute boundary; and prior findings surviving a new qualifying break.

Source checks are recorded in the PR. No new physical read or independent comparison has been performed. `TC-EVENT-03` (card transitions across unknown activity), interactive zoom and the proposed activity palette remain separate work.

## Owner test during stationary breaks on 2026-10-02, before about 12:45 Europe/Vienna

Run only after the exact candidate is available on a test or production origin and its build SHA is confirmed. An open PR by itself does not update the phone.

1. Open/update the PWA and record the build SHA. Explicitly select the saved card and inspect recent day details. Known driving/work/rest durations should be preserved; days with missing intervals should show the incomplete-data note.
2. Check Periods. A full recorded period should retain its total; missing days or intervals should show an unconfirmed total rather than zero. An incomplete first retained local day can be expected when the previous UTC day's edge is absent.
3. Check Attention. If the recorded card contains an actual standard-break exceedance, verify the finding and its notice are red and the excess minutes and local labels are readable. Do not create an infringement to test the color; use an authorized saved fixture if no real finding exists.
4. While stationary, perform the usual LIVE → Read card flow. Verify packet/byte progress, completion, history and normal retry. This checks that the surrounding changes have not affected the proven reading path.

Do not clear good card data to test. Record the observed build, model, phone/browser and technical attempt code; no raw card payload is required in telemetry. The open free beta remains available during the owner's two-week vacation. Existing automatic technical events report supported attempts when delivered; no scheduled monitoring or guaranteed report frequency is added by this candidate.
