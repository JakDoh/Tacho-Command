# Day detail 24 h timeline — 2026-09-18

## Scope

A tap on a day in the reconstructed 56-day premium history opens a 00:00–24:00 detail view with:

- large hourly marks,
- 30-minute marks,
- 15-minute marks,
- exact activity segment start/end positions when those positions are supplied,
- minute totals for driving, work, availability and rest,
- card inserted / card removed markers when those events are present,
- chronological activity rows.

The underlying tahograph activity always remains the source of truth. A 7–15 minute WORK segment that begins exactly at a confirmed card-inserted event may be shown with the contextual label **Provera vozila**. It is still stored and counted as WORK.

## Truth boundary

No card event is fabricated. When the parsed state does not provide confirmed insert/remove markers, the UI explicitly says that those markers are unavailable.

Legacy history segments that only contain ordered durations remain supported. Their display positions are derived sequentially from midnight for backward compatibility.

## Persistence

The existing `tc-card-snapshot-v1` schema remains backward compatible. Optional daily detail metadata is preserved when present:

- `startMinute`
- `endMinute`
- `cardStatus`
- `label`
- day `events`

Older stored snapshots without these optional fields still load.

## Explicitly unchanged

- Golden 0.32c transport is untouched.
- No BLE/DDP/UDS/TREP behavior changes.
- No card parser is merged or changed.
- No telemetry write changes.
- No routing or deployment changes.
