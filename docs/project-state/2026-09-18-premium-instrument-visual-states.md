# Premium instrument visual states — 2026-09-18

This change is presentation-only.

- panel borders move from 1px to 1.5px for clearer instrument separation;
- the continuous-driving bar now renders one of four visual states: neutral, safe, warning, limit;
- the selected state comes only from `FieldProvenProductState.continuousBand`;
- CSS does not decide legal thresholds;
- without a verified profile, the adapter keeps the band neutral;
- daily/weekly bars remain visually unchanged.

Safety boundary:

- no Web Bluetooth;
- no DDP/UDS/TREP;
- no Driver Card Slot 1 transfer changes;
- no parser changes;
- no telemetry-write changes;
- no compliance-rule changes;
- no route switch or production deploy;
- golden 0.32c remains permanently immutable.
