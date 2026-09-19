# TachoCommand — Sites ownership recovery checkpoint — 2026-09-19

## Purpose

This checkpoint records the current production-source state and the ChatGPT Sites ownership/access incident discovered on 2026-09-19. It is documentation only. It must not change the live Site, custom domains, DNS, secrets, D1 binding, PWA behavior, or the golden 0.32c transport.

## Canonical source state

- Repository: `canicboban-source/Tacho-Command`
- Canonical branch: `main`
- Current production-source commit: `d3b90324e164b7e9a06b2a92977a395f3b19b436`
- PR: `#85 — Cut production TachoCommand app over to field-proven App V2`
- PR status: merged
- App V2 production source cutover is complete in GitHub.
- The golden 0.32c transport remains unchanged.

## Existing ChatGPT Site identity

- Site project ID: `appgprj_6a84bff118b481919b6ed5d54636f18b`
- Sites-generated URL: `https://tachomaster.canicoban.chatgpt.site`
- Custom domains:
  - `tachocommand.com`
  - `www.tachocommand.com`
- D1 binding: `DB`

The existing Site and its custom domains are to remain in place. Do not create a replacement Site or change DNS merely because management access is currently unavailable.

## Ownership/access incident

On 2026-09-19 the operator discovered that only `Cane Cane's Workspace` is visible in the ChatGPT app and that the former Personal workspace is no longer available in the workspace switcher.

Current observations:

- the Business workspace is `Cane Cane's Workspace`;
- its owned Sites are BusCommand-related;
- `Sites > Shared with you` is empty;
- the TachoCommand Site does not appear as owned or shared in the Business workspace;
- the TachoCommand production Site/custom domains remain the existing production identity;
- OpenAI support has been escalated to a support specialist for ownership/management recovery.

The working hypothesis, based on support guidance, is that the Personal workspace was merged into the Business workspace and the TachoCommand Site did not transfer with that merge. This is an access/ownership incident, not evidence that the domain, repository, or product source has been lost.

## Safety hold

Until ownership is recovered or a support specialist gives a definitive recovery path:

1. Do not change `tachocommand.com` or `www.tachocommand.com` DNS.
2. Do not remove the custom domains from the existing Site.
3. Do not create a new production Site as a substitute.
4. Do not rotate or delete production secrets.
5. Do not change the D1 binding `DB`.
6. Do not move production hosting to AppDeploy/Netlify/another provider merely to bypass the ownership issue.
7. Do not modify the golden 0.32c transport.
8. Continue source work only through normal GitHub review/CI gates.

## Support recovery request

The requested outcome is:

- restore management access to the existing Site; or
- transfer ownership/management of the existing Site to `Cane Cane's Workspace`;

while preserving:

- Site project ID `appgprj_6a84bff118b481919b6ed5d54636f18b`;
- Sites-generated URL `tachomaster.canicoban.chatgpt.site`;
- `tachocommand.com`;
- `www.tachocommand.com`;
- existing DNS;
- existing secrets;
- D1 binding `DB`.

OpenAI support escalation is active and replies are expected by email/support conversation.

## PC recovery check — next session

Before any hosting change, perform this read-only check from the PC:

1. Open ChatGPT on web/desktop.
2. Inspect the account/workspace switcher.
3. Check whether the former Personal workspace is still available there.
4. If it exists, open `Sites` and locate TachoCommand.
5. If TachoCommand is accessible, inspect Settings/Share only; do not change domains/secrets before confirming ownership state.
6. If the Personal workspace is absent there as well, leave hosting untouched and continue with the escalated support path.

## Deployment target once access is restored

The approved source to publish is:

`d3b90324e164b7e9a06b2a92977a395f3b19b436`

from:

`canicboban-source/Tacho-Command`

Expected production fingerprints after a successful #85 publish:

- `/app` renders App V2;
- `manifest.webmanifest` uses `id: "/app"` and `start_url: "/app"`;
- service worker cache is `tachocommand-shell-v46-app-v2`;
- no legacy `/app` recovery redirect to `/field-test?recovered=031`.

Do not treat GitHub merge as proof that the existing ChatGPT Site has published this commit. Live production must be verified separately after Sites management access is restored.
