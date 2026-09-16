# TachoCommand — Premium OLED Landing Brief

Date: 2026-09-16
Branch: `feat/premium-oled-landing-20260916`

## Product promise

The landing page must make TachoCommand feel like a serious cockpit product for professional drivers, not a generic SaaS template.

Primary visitor reactions:

- “This understands my real tachograph problem.”
- “I can see exactly what I get.”
- “I can connect this myself.”
- “This helps me avoid mistakes before they become expensive.”
- “This looks trustworthy enough to use in a bus or truck.”

## Visual direction

- OLED-first black background, near-black layered surfaces, no grey web-template look.
- Controlled instrument-light accents: cyan / green for healthy state, amber for warnings, red only for actual limit / failure states.
- Large technical typography and compact monospace values for driving/break timers.
- Cinematic depth through glow, blur and layered panels, but no noisy particle effects or childish animations.
- Real app screenshots replace placeholders as soon as each screen is stable.
- Desktop presentation should feel premium; mobile must remain the primary experience.

## Landing information architecture

### 1. Hero — “Know your shift before the tachograph surprises you”

Hero must communicate in one screen:

- live driving / break status;
- preventive warnings before limits;
- 56-day driver-card history;
- direct Smart Tacho 2 connection;
- Android + supported VDO DTCO path;
- one clear CTA: start / open TachoCommand.

Hero visual should use a real TachoCommand cockpit screenshot once available. No invented field screenshot.

### 2. Proof strip — what is already proven

Replace old “validation in progress” language with field-proven facts:

- complete VDO DTCO 4.1a Driver Card Slot 1 download succeeded physically;
- 67,295-byte Gen2 v2 card file completed end-to-end;
- 61 TLV objects structurally validated;
- 217 consecutive daily activity records decoded;
- current 56-day window fully covered;
- read-only live RDBI lane remains separate.

Do not expose personal card data in public screenshots or copy.

### 3. “What TachoCommand actually does”

Use visual product modules instead of feature cards:

- Live Cockpit
  - current activity;
  - continuous driving;
  - break progress;
  - countdown to warning / limit.

- Card Intelligence
  - 56-day timeline;
  - driving / work / availability / rest;
  - historical day drill-down;
  - missing-data / unknown-period warnings.

- Driver Safety
  - preventive warning before legal / national thresholds;
  - split-break progress;
  - weekly / two-week driving overview;
  - daily / weekly rest layer when validated.

- Compliance Profiles
  - rules are profile-based, not hard-coded globally;
  - EU 561 standard;
  - Austrian regular passenger service <=50 km profile;
  - future country / regime profiles.

### 4. Beginner section — “I have never connected a phone to a tachograph”

This section is mandatory and should be one of the strongest parts of the page.

Use large numbered cards plus screenshots / diagrams.

For VDO DTCO 4.1a, base the pairing guide on the official manual:

1. Park safely and keep the vehicle stationary.
2. Turn Bluetooth on on the phone.
3. On DTCO: Driver 1 -> Bluetooth -> Pairing.
4. Start pairing on the phone when DTCO appears in Android Bluetooth.
5. Compare the six-digit PIN shown on the phone and DTCO.
6. Confirm pairing on the phone.
7. Confirm on DTCO with the arrow / confirmation sequence.
8. Finish pairing with OK until the DTCO reports successful connection.
9. Open TachoCommand in supported Android Chrome / secure context.
10. Select the tachograph and grant the requested Bluetooth permission.

The page must explain common failure states in plain language:

- DTCO does not appear in phone Bluetooth list;
- PIN does not appear;
- previously paired phone causes stale pairing;
- browser has no Web Bluetooth support;
- Bluetooth permission denied;
- driver card missing / wrong slot;
- unsupported tachograph model.

### 5. “First 60 seconds after connection”

A beginner should know what happens next:

- connection check;
- live status / supported data;
- card download when explicitly requested;
- progress view;
- local parsing;
- 56-day timeline;
- warnings and rule profile.

State clearly that TachoCommand does not replace the tachograph or applicable law.

### 6. Real screenshots

Required screenshot set for release-quality landing:

1. main cockpit;
2. 4h15 / 3h45 preventive-warning state;
3. 56-day timeline;
4. day-detail view;
5. warnings / infringement-candidate list;
6. Bluetooth connection screen;
7. full card-download progress;
8. successful card-read confirmation;
9. legal-rule profile selector;
10. beginner pairing walkthrough.

All screenshots must be from actual TachoCommand UI. Personal identifiers must be removed or generated from synthetic demo data.

### 7. “Why this matters” — serious product story

Explain the pain without marketing fluff:

- tachograph data is technically available but difficult to interpret quickly;
- a driver often needs the answer while working, not later at a desk;
- continuous driving, split breaks, rest and weekly limits interact;
- different operating regimes can have different rules;
- mistakes can come from misunderstanding, not intent;
- TachoCommand turns card / tachograph records into a driver-oriented cockpit and explains the next decision.

### 8. Compatibility and truth table

Show supported / tested / planned separately.

At minimum:

- VDO DTCO 4.1a: physically field-tested path;
- Android Chrome / Web Bluetooth: supported field path;
- Gen2 v2 driver-card download: physically proven;
- iPhone / Safari: not supported in current Web Bluetooth path;
- other Smart Tacho 2 devices: do not claim support without field proof.

### 9. Safety / privacy

Use a premium trust section, not legal fine print only:

- no public upload of raw personal driver-card fixture;
- parser regression tests use synthetic bytes;
- UI should avoid exposing identity fields where they are not needed;
- distinguish operational warning, limit, infringement candidate and authority-confirmed infringement;
- legal profile must be known before a legal verdict is shown.

### 10. Pricing / CTA

Pricing belongs late on the page, after product proof and onboarding.

The visitor must first understand:

- what it does;
- whether it works with their setup;
- how to connect;
- what they gain;
- why it is trustworthy.

Only then show trial / purchase CTA.

## Copy corrections required from current landing

The current landing still contains pre-field-proof language and must be updated:

- remove “Path to 56 days” as a future promise;
- remove claims that card-download still awaits field validation;
- remove “localized UI preview, not a field screenshot” once real product screenshots are available;
- keep compatibility language evidence-based;
- preserve SR / EN / DE localization.

## Content quality bar

Every major landing claim must fit one of these categories:

- physically field-proven;
- deterministic parser-proven;
- source-backed legal / product rule;
- clearly labelled planned / in development.

No vague “AI-powered”, “revolutionary”, “smartest”, or unsupported compliance claims.

## Next implementation step

Refactor `app/landing-page.tsx` and landing CSS into the new OLED narrative while preserving localization and current auth / trial launch behavior. Add real screenshot slots with synthetic/demo data only until production screenshots are approved.
