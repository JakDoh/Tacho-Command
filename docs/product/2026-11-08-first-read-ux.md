# First-read UX and language continuity

Preview branch: `feat/first-read-language-ux`.

- Root landing starts in English and resolves to the saved or browser-supported language while preserving query attribution and the connection anchor.
- Explicit localized routes remain authoritative. Legal pages honor their `lang` query.
- Language changes notify the analytics controls in the same tab and keep the document language current.
- The app logo returns to the selected landing language.
- First use explains pairing and offers Connect plus the localized guide; no fake zeroes or completion claims are introduced.
- The landing hero contains a real app frame from the supplied recording, labeled as an example read. Mobile keeps the connection guide visible.
- Preview uses a separate Worker name, no production routes, data bindings or application secrets. Google Analytics stays production-host-only.

Validation: typecheck, lint (two existing unused-variable warnings), verified production build and 366 tests passed locally before preview setup was added. No hardware connection was attempted. Mobile first-frame geometry and the real browser language flow must be verified on the isolated preview before publishing. The preview screenshot contains English labels regardless of page locale; it is an example recording, not a current live read.

No changes to BLE transport, card parsing or driving-time calculations. No active ad settings changed. Do not merge until the preview is reviewed.
