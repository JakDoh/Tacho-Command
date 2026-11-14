# TachoCommand

**Read a supported tachograph. Understand your recorded day.**

TachoCommand is a mobile-first web app for professional truck and bus drivers. Connect a supported tachograph over Bluetooth, download the Slot 1 driver card and inspect recorded activity on your phone.

**Open, free beta:** no account, email confirmation, purchase or configured expiry during the beta.

[Open the app](https://tachocommand.com/app) · [Serbian landing & connection guide](https://tachocommand.com/sr#connect) · [English](https://tachocommand.com/en#connect) · [Deutsch](https://tachocommand.com/de#connect)

## Start with the proven setup

- **Hardware:** the strongest recorded physical evidence is for Continental VDO DTCO 4.1a / GEN2 V2, Driver Card Slot 1.
- **Phone:** Android with Chrome and Web Bluetooth. Other tachographs, firmware and browsers require their own evidence; iPhone/Safari support is not established for this path.
- **When:** connect, configure and read only while safely stationary.
- **How:** follow the connection guide, connect the tachograph, then choose **Read driver card**. Inspect **History**, **Periods**, **Attention** and **Card** after completion.
- **Privacy:** card identity/history stays in the local browser profile. Keep the same browser/origin to access saved data; clearing site data can remove it.

The app supports Serbian, English, German, Russian, Bulgarian, Romanian and Hungarian. Translation and device-menu parity still need native/field review.

## Verified release checkpoint — November 1, 2026

| Evidence | Status |
| --- | --- |
| Published application source | [`73664bc9e6dc`](https://github.com/canicboban-source/Tacho-Command/commit/73664bc9e6dc45a8d893e785c1c079cb7a298a6e), PR #111 |
| Release label | `2026.09.30-beta.3` remains unchanged; use **Build** under **Card** to identify the actual source |
| Production deployment | [Cloudflare run #15](https://github.com/canicboban-source/Tacho-Command/actions/runs/41320622868) succeeded |
| Live verification | `/app` displayed build `73664bc9e6dc`; technical telemetry readiness returned `ready` |
| Automated verification | 353 tests passed; typecheck, builds and GitHub CI/quality checks passed; lint had zero errors and two existing warnings |
| Physical verification of this update | Pending the next stationary hardware read; automated checks do not replace it |

This is a dated checkpoint, not a guarantee of current service health or universal device compatibility. This README update itself changes no application behavior and requires no deployment.

## Recent improvements

- **Complete coverage:** a date alone no longer makes a period complete. Missing intervals leave the period unconfirmed while known daily activity remains visible (PR #107).
- **Readable day details:** activity colors, a legend, 1×–8× zoom, horizontal scrolling and selectable segments (PR #110).
- **Clock changes:** 23/25-hour local days use actual elapsed time. Repeated-hour intervals remain distinct and ordered, with historical UTC offsets (PR #111).
- **Card events:** removal/reinsertion survives unknown activity, including consecutive-day midnight transitions and the read cutoff (PR #111).
- **Support reports:** final transfer reports fit D1 statement limits; preparation and stationary-response diagnostics distinguish failure stages (PRs #108–#110).

Saved canonical activity benefits from the new timeline projection. Card events omitted by an older parser require a **fresh read**; they cannot be reconstructed from an old summary.

## Current capabilities

| Area | Implemented behavior |
| --- | --- |
| LIVE | Activity, continuous driving and cumulative break; optional daily/weekly driving values remain unknown when unavailable. Confirmed samples and saved values are distinguished. |
| Card | Full Driver Card Slot 1 BLE download, actual packet/byte progress, cancellation, wake-lock request and bounded waits. |
| History | Up to 56 retained UTC calendar days, projected to the phone's time zone, newest first. Day details include a timeline, durations and available insertion/removal markers. |
| Periods | LIVE daily/weekly values and a card-derived previous-calendar-week plus current-week total. Missing dates keep the latter unknown; unknown intervals inside a day also keep the aggregate unconfirmed. |
| Break screening | Scoped standard 4 h 30 min driving-break check: 45-minute break or ordered 15 + 30-minute split. Not a full infringement engine. |
| Local data | Explicit saved-card selection, deletion and CSV overview. Failed reads preserve the previous good snapshot; failed persistence is clearly labelled. |
| Product | Seven-language landing/app surfaces, installation help and pairing guidance; guide parity and translations need device/native review. |
| Support | Random attempt codes, restricted technical telemetry, queued delivery and authenticated admin overview. |
| PWA | Offline shell, explicit updates and exclusion of API/admin responses from caching. Shell availability does not prove every workflow works offline. |

Detailed speed history, LIVE use while driving, payments, signed DDD export and full legal analysis are **not current capabilities**. LIVE closes before card download; automatic LIVE continuation afterward is not implemented.

## Compatibility and proof

The strongest checked-in physical proof covers **Continental VDO DTCO 4.1a / GEN2 V2, Android Chrome, Driver Card Slot 1**. See the [App V2 field proof](docs/field-evidence/2026-09-19-app-v2-card-field-proof.md).

The owner has also reported successful DTCO 4.1 reads; current landing copy mentions 4.1 / 4.1a. An individual successful run is not certification of every firmware, phone or card. Other models, Stoneridge and iPhone/Safari remain unconfirmed for this path. New claims need recorded model/firmware/browser/build evidence.

One complete sample contained **269 submessages, 67,295 bytes and 61 TLV objects**. These are sample values, not mandatory counts for every card. Transfer completion, parser acceptance, independently checked accuracy and cryptographic authenticity are separate checks.

## Testing and reporting a problem

Keep the last good saved card. Record the app's **Build**, tachograph model/firmware, phone/browser, the **TC-… attempt code**, what you expected and what happened. Useful checks include an ordinary day, a known card removal/reinsertion and the repeated clock hour if present. See the [November field-check plan](docs/releases/2026-11-01-day-integrity.md#morning-field-check--november-2-2026-europevienna).

[Report an issue](https://github.com/canicboban-source/Tacho-Command/issues). Do not post raw card downloads, identity, card numbers or unredacted personal history in public issues. Attempt codes and sanitized technical diagnostics are the intended support path.

## What remains to verify

- A fresh physical read and phone visual check for the November update.
- Independent comparison of selected days against an authorized card reader/source record.
- Broader hardware/firmware evidence, first-use recovery and installed-PWA/background behavior.
- Actual return use and campaign attribution: existing product events and technical reports do not establish a complete visitor → successful read → returning driver funnel.

## Documentation and historical findings

- [Documentation index](docs/README.md)
- [November day-integrity changes and field-check plan](docs/releases/2026-11-01-day-integrity.md)
- [October timeline and final-report improvements](docs/releases/2026-10-02-terminal-telemetry-and-timeline.md)
- [Coverage changes](docs/releases/2026-10-01-card-coverage-candidate.md)
- [Open-beta access policy](docs/releases/2026-09-30-open-beta.md)
- [October 1 source review](docs/audit/2026-10-01-source-review.md), [project-state checkpoint](docs/project-state/TACHOCOMMAND-CANONICAL-STATE.md) and [roadmap](docs/product/TACHOCOMMAND-ROADMAP.md)

The October 1 documents describe their dated baseline. Their statements that TC-DATA-01, TC-TIME-02, TC-EVENT-03 or zoom remain unimplemented are superseded by PRs #107, #110 and #111. Preserve those reviews as historical evidence; source fixes do not imply independent accuracy certification or new hardware proof.

## Golden 0.32c is locked

Immutable reference: [original field artifact and evidence](docs/field-evidence/2026-09-16/README.md).

`docs/field-evidence/2026-09-16/TachoCommand-0.32c-driver-card-slot1-field-test.html`

SHA-256: `cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`

Do not edit, reformat or replace that artifact. Preserve proven protocol commands and credit/ACK behavior. Protocol research belongs in a separate isolated candidate and must never silently replace the golden path. Current operational wrapper bounds differ from historical artifact timing; neither is changed by this update.

## Honest data and privacy

- Connect, configure and read only while safely stationary. LIVE has a stationary guard; card reading has a preflight. Continuous app-side speed monitoring during the separate download is not established.
- Unknown is not zero, rest, compatibility confirmation or a clean legal verdict.
- Card identity/history stays local in the browser profile. Shared-phone users must explicitly select/delete saved data; there is no account isolation.
- Technical telemetry excludes identity, card number, vehicle identity, location, device name, raw bytes and measured tachograph values. Product analytics uses random visit IDs and restricted events; this is not a blanket anonymity claim about hosting logs.
- Technical-event retention is 60 days; product-event retention is 90 days. Scheduled cleanup exists; actual execution must be checked separately.
- CSV is a user overview, **not an official signed DDD file**. DDD signature/certificate validation is not implemented.
- Operator identity, privacy/legal review and commercial/payment requirements remain release work, not completed compliance claims.

## Development and verification

Node.js **22.13 or newer**; CI uses Node 22. Dependencies are locked in `package-lock.json`.

```bash
npm ci
npm run dev
```

```bash
npm run typecheck
npm run lint
npm test
npm run validate:artifact
npm run build:cloudflare
```

`npm test` builds/validates the artifact and runs the Node suite. The November 1 candidate passed 353 tests, typecheck, standard and Cloudflare builds; lint had zero errors and two existing warnings. GitHub CI/quality checks also passed on Node 22. These checks do not replace hardware/mobile testing.

## Source map

| Path | Responsibility |
| --- | --- |
| `app/app/page.tsx`, `app/app-v2/app-v2-client.tsx` | Active app and LIVE/card lifecycle |
| `app/app/field-proven-premium-ui.tsx`, `app/app/day-timeline.tsx` | Driver screens, day details and interactive timeline |
| `lib/app-v2-golden-card-*.js` | Golden-compatible protocol/browser transport |
| `lib/app-v2-canonical-card-parser.js` | TLV and activity parsing |
| `lib/app-v2-parser-card-adapter.js`, `lib/app-v2-phone-timeline.js` | UTC normalization and local display |
| `lib/card-coverage.js`, `lib/card-period.js` | Continuous activity coverage and calendar-period aggregates |
| `lib/card-utc-review.js`, `lib/card-break-analysis.js` | UTC break screening and CSV |
| `lib/last-good-card-snapshot.js` | Snapshot validation/persistence |
| `app/api/`, `app/admin/`, `db/`, `drizzle/` | Telemetry, analytics, admin and schema |
| `public/sw.js`, `app/service-worker-register.tsx` | Offline shell and updates |
| `worker/index.ts`, `wrangler.jsonc` | Independent Cloudflare Worker |

Legacy/manual and field-test surfaces remain; they are not the authoritative `/app` product. Classify before removal.

## Delivery

`main` is the integration target. Production uses independent Cloudflare Worker `tachocommand`, binding `DB` to `tachocommand-prod`. Retained Sites files are history/build support, not a direction to deploy there.

Use the existing **Cloudflare production deploy** workflow with the full reviewed `main` SHA. It builds, tests, checks the fixed target, applies versioned migrations and deploys. A merge or successful workflow does not replace live origin/build/API checks and required hardware verification. Documentation-only changes do not require deployment.
