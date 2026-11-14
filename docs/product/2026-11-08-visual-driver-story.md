# Visual driver walkthrough

The mobile product explanation follows seven steps: connection, card transfer and confirmed saving, current overview, 56-day history, a day timeline, calendar-period totals and the driving-break check. Each explanation is followed by its corresponding recorded app screen; desktop may place them alongside one another.

## Evidence assets

All eight WebP images in `public/story` are direct crops from the owner's supplied `1000060886.mp4` recording (SHA-256 `6a015bcda554d69ee1f9ee9fed596adfc4f21724184306565a82d04bfa8725e7`). Cropping and proportional resizing remove phone chrome and unrelated content. No values, findings or controls are fabricated or retouched. They show the recorded UI, not a new live read.

| Asset | Source second | Crop width × height, x, y |
| --- | ---: | --- |
| connected | 23 | 1008 × 332, 36, 1504 |
| reading | 241 | 1008 × 650, 36, 1310 |
| saved | 278 | 1008 × 180, 36, 260 |
| overview | 45 | 1008 × 1120, 36, 90 |
| history | 278 | 1008 × 1500, 36, 240 |
| day | 287 | 1008 × 650, 36, 930 |
| periods | 272 | 1008 × 1300, 36, 510 |
| break-check | 307 | 1008 × 700, 36, 990 |

Images are 720 pixels wide and total approximately 142 KB. Captions in all seven locales identify them as real example screens with English labels. The recorded history shows 56/56 available days. The break screen explicitly has no exceedance found by this limited check; neither a fabricated infringement nor a broad compliance claim is presented. Card identity screens were excluded.

The timeline legend matches the captured app colors (white driving, yellow work, purple availability, blue rest). Supplemental questions use native details elements. No transport, parser, analytics consent or driving-time calculations change.

Validation includes typecheck, the verified build, all existing tests and asset/dimension checks. The old landing test's bare `72` pattern was narrowed to the trial-duration language it intended to reject; 720-pixel screenshots must not be mistaken for a 72-hour trial. Physical Android/Bluetooth behavior is outside this presentation change.
