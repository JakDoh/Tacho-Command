# Detailed-day integrity — 2026-11-01 candidate

Base: `d744f4bd44c97b7bd9663c193e7aa8eb52295ce5` (PR #110).

The October 1 README/audit/roadmap are historical checkpoints: PR #107 already fixed TC-DATA-01, and PR #110 added activity colors, zoom and selection. This candidate completes the remaining TC-TIME-02 and TC-EVENT-03 work; it is not hardware verification or a deployment record.

## Changes

- Position projected activities by elapsed UTC minutes since the actual local-day start. A Vienna autumn day has 1500 minutes and a spring day 1380. Preserve local clock labels and add historical UTC offsets on those days. Repeated intervals stay in chronological order and cannot cover each other.
- Preserve separate repeated-hour card events by UTC instant, including through the UI state boundary. The ruler, segment selection and sequence list use the projected chronology.
- Extract insertion/removal transitions directly from parser activity-change words before unknown activity is omitted. Preserve consecutive-day midnight transitions, deduplicate events and apply the read cutoff. Never invent activity to fill a gap or treat the first observed card state as an insertion.
- Legacy segment-based event inference requires contiguous segments; it cannot establish the time of an event across an unknown gap.

Canonical UTC storage and recorded durations are unchanged. Golden BLE commands, reference, timeout/ACK behavior, telemetry and free-beta policy are untouched. Existing saved cards benefit from the timeline projection immediately after updating. Events lost by the old parser cannot be reconstructed from old saved summaries: a fresh card read is required.

## Verification

Local candidate: 353/353 tests pass, including raw synthetic TLV → parser → normalized card, cutoff, midnight events, repeated-hour projection → UI state → actual rendered timeline, and spring-forward duration checks. Typecheck passes. Lint has zero errors and the two pre-existing unused-variable warnings. Standard production build and artifact validation pass. The immutable golden artifact hash remains `cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`.

No new physical read or visual phone verification has been performed. Independent reader comparison remains pending.

## Morning field check — November 2, 2026 (Europe/Vienna)

Only test this candidate after deployment and confirming its exact build SHA in the app. A PR or merge alone does not update the phone.

1. Keep the last good saved card. Open/update the app while stationary, record build SHA, tachograph model/firmware and phone/browser.
2. Inspect an ordinary saved day: durations must agree with the previous version. Check zoom and tap a segment.
3. If the card contains activity on October 25, inspect the repeated 02:00 hour: entries must remain in order and distinguish UTC+02:00 from UTC+01:00. No actual repeated-hour activity is required to complete a normal read test; synthetic tests cover that case.
4. Perform the usual LIVE → card read while stationary. Record the TC attempt code, completion, packet/byte counters and whether history is saved. Counts depend on the card; 269 is not a required count.
5. Inspect a day with a known removal/reinsertion, if present. The markers should remain visible even when activity between them is unknown. Missing intervals must not appear as rest.
6. If a read fails, retain the previous good card and record the error and attempt code. Do not clear storage or repeatedly alter pairing as a troubleshooting shortcut.

A successful download alone does not independently validate every duration or legal rule. Compare selected days against an authorized independent reader when available.
