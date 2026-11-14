# Stationary preparation diagnostics — 2026-10-02

The field attempt TC-8ZWBR6 stopped at `stationary_check` with zero card packets and the historic combined signal `stationary_not_confirmed` (034). This establishes the failed preparation step, not its physical cause.

New card preparation reports distinguish the existing LIVE transport error messages:

| Code | Signal | Meaning |
| --- | --- | --- |
| 034 | stationary_not_confirmed | Historic combined signal; no retrospective inference |
| 035 | stationary_response_unconfirmed | Speed response was not validated; missing and invalid responses remain combined |
| 036 | stationary_response_nonzero | The existing classifier accepted the response and classified it as nonzero |

Only the telemetry classifier, ingress allow-list and admin labels change. No raw speed or response bytes are sent. No BLE requests, timing, retries, stationary gate, teardown or golden 0.32c card transport change. A fresh field report is needed to identify which branch caused the preparation failure; this release does not fix that failure.

The separate missing terminal report for TC-NHNH48 remains unresolved. A local 269-packet simulation produced a nine-event final batch with completion preserved, so the 20-event batch limit was not established as its cause.

After publication, verify the exact deployed build before testing while stationary. New 035/036 reports must remain failed with zero transferred packets; historical 034 reports retain their original meaning.
