# TachoCommand

Mobile-first PWA for professional truck and bus drivers. The current pilot is a transparent manual assistant for continuous driving, daily driving, shift duration, breaks, and a local activity log.

## Product boundary

TachoCommand does **not** claim that browser data is official tachograph data until a manufacturer-specific Smart Tacho 2 protocol is verified on physical hardware.

- Demo and manual data are always labelled.
- A BLE connection never silently becomes a verified tachograph connection.
- The app does not generate fake `.DDD` files.
- The official tachograph, driver card, signed downloads, and applicable law remain authoritative.
- Driver data is kept on the device in this pilot; no account is required.
- Third-party advertising is excluded from the cockpit and Bluetooth permission surface.

## Confirmed technical basis

- Commission Implementing Regulation (EU) 2021/1228 requires a Smart Tacho 2 ITS interface compatible with Bluetooth Low Energy 5.0 or newer.
- Personal driver data exposed through ITS requires driver consent in operational mode.
- Chrome for Android exposes Web Bluetooth only in secure contexts.
- Real data access still requires physical VDO DTCO 4.1 / Stoneridge SE5000 Smart 2 testing and the correct service/protocol identifiers.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Quality gates:

```bash
npm test
npm run lint
npm run validate:artifact
```

## Structure

- `app/tacho-command-app.tsx` — cockpit, manual log, BLE compatibility centre, settings
- `app/globals.css` — mobile-first interface and accessibility states
- `public/manifest.webmanifest` — installable PWA metadata
- `public/sw.js` — same-origin offline shell
- `tests/product-safety.test.mjs` — guardrails against fake payment, licence, and `.DDD` implementations

## Pilot checklist

1. Test installation and offline recovery on current Android Chrome.
2. Test BLE selection on VDO DTCO 4.1/4.1a and Stoneridge SE5000 Smart 2.
3. Record exposed GATT services only after driver consent and controlled stationary testing.
4. Obtain manufacturer protocol documentation or an authorised integration path.
5. Add signed-file validation before enabling any `.DDD` export.
6. Complete privacy, terms, legal review, and field-driver validation before commercial release.
