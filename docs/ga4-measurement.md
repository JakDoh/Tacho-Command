# TachoCommand GA4

Property: TachoCommand (`561730294`), web stream `16248689293`, measurement ID `G-MFSVXSN9VV`. Reporting timezone: Austria; currency: EUR. IDs are public configuration, not secrets.

Google loads only on the public production pages after explicit analytics consent. Refusal leaves the app usable. Settings permit withdrawal without reloading or interrupting a card read. Card data, names, support codes, raw errors and raw URL query strings are excluded. Advertising consent remains denied; Google signals and advertising personalisation are disabled. Enhanced measurement is disabled in GA4 to prevent automatic URL/form collection and duplicate page views. Cookies expire after 90 days of inactivity.

## Events

- `page_view`: public page navigation, sanitised path/title/referrer origin.
- `app_open`: arrival on `/app` or `/app-v2`.
- `open_app_click`, `connection_guide_click`: existing public calls to action.
- `card_read_start`: accepted read action.
- `card_read_success`: accepted result with current card, including accepted but unsaved results. Main key event; no monetary value.
- `card_read_error`: unsuccessful outcome.
- `card_read_cancelled`: aborted attempt.

A successful event indicates an accepted application result, not independent certification of every decoded value. Physical verification remains necessary.

## Campaign links

Use these for organic posts; replace `social` with `paid_social` only for paid promotion. Change `bio` to `demo` or `story` when applicable.

- Instagram: https://tachocommand.com/sr?utm_source=instagram&utm_medium=social&utm_campaign=beta_nov2026&utm_content=bio
- TikTok: https://tachocommand.com/sr?utm_source=tiktok&utm_medium=social&utm_campaign=beta_nov2026&utm_content=bio
- X: https://tachocommand.com/sr?utm_source=x&utm_medium=social&utm_campaign=beta_nov2026&utm_content=bio

Only those campaign values are permitted in the client. New campaigns require updating the allowlist. GA4 traffic acquisition reports distinguish source/medium and campaign. Compare visits, app opens, read starts and successful reads; do not judge interest from views alone. Consent refusals and blockers mean GA4 covers only part of traffic. Collection is not retroactive.

## Verification

Automated tests cover no script before consent/refusal, sanitisation, event allowlist, duplicate prevention, excluded hosts/routes, revocation and cross-tab refusal without reload. Production smoke test: decline and verify no Google tag; allow and confirm page_view/app_open in Realtime. Do not fabricate successful reads for testing. Complete a stationary physical read and confirm its real outcome after deployment. Existing first-party analytics and technical diagnostics remain separate.
