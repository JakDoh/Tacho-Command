# Product-state adapter boundary — 2026-09-18

This adapter is the only approved bridge between already-proven product data and the reconstructed premium UI.

It does not talk to a tachograph. It does not use Web Bluetooth, DDP, UDS, TREP, RequestTransferExit or StopCommunication. It does not post telemetry. It does not parse raw driver-card bytes and it does not make legal conclusions.

## LIVE input

The adapter accepts already-decoded values from the proven read-only LIVE layer:

- connection state;
- normalized device label for display;
- last LIVE read label;
- F903 activity;
- F923 continuous-driving seconds;
- F99A daily-driving seconds;
- F99B weekly-driving seconds;
- accepted technical-event count;
- anonymous TC-XXXXXX support code.

The adapter converts seconds to display minutes and maps the activity to the premium UI contract.

## Card/history input

The adapter accepts already-parsed product data only:

- display driver name when the product has a legitimate local source for it;
- masked last four card digits;
- read-complete state;
- 56-day availability count;
- already-parsed history rows expressed as activity-minute segments;
- 14-day driving total;
- attention text produced by a separately verified rules layer.

No raw .DDD/card payload enters this boundary.

## Continuous-driving threshold

The adapter intentionally has no built-in legal threshold.

A verified active rule/profile may supply:

- continuousThresholdMinutes;
- continuousWarningMinutes.

Only then does the adapter compute progress, remaining time and a neutral/safe/warning/limit visual band. Without a verified profile, the UI stays neutral and shows no invented threshold.

This prevents CSS or presentation code from becoming a hidden legal-rules engine.

## Safety

The golden 0.32c Driver Card Slot 1 transport remains untouched. The /app route remains unchanged. Production remains unchanged. This adapter branch is an integration candidate only.
