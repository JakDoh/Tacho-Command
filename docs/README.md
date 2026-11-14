# TachoCommand documentation

Updated: 2026-10-01. Start with current documents; dated evidence is not a current release instruction.

## Current living documents

| Document | Purpose |
| --- | --- |
| [Repository README](../README.md) | Product overview, source map, development and delivery |
| [Canonical state](project-state/TACHOCOMMAND-CANONICAL-STATE.md) | Current implementation, evidence boundaries and working rules |
| [Roadmap](product/TACHOCOMMAND-ROADMAP.md) | Proposed priorities and acceptance gates |
| [2026-10-01 source review](audit/2026-10-01-source-review.md) | Reproduced open findings and review limits |
| [Open beta release](releases/2026-09-30-open-beta.md) | Current access policy; supersedes email/72-hour access |

## Immutable or historical evidence

- [Golden 0.32c proof](field-evidence/2026-09-16/README.md): byte-exact locked transport reference.
- [App V2 card field proof](field-evidence/2026-09-19-app-v2-card-field-proof.md): physical transport/parser result for its stated hardware/source.
- [2026-09-17 verification](project-state/2026-09-17-field-verification.md): dated physical observations.
- [2026-09-18 day details](project-state/2026-09-18-day-detail-timeline.md), [snapshot](project-state/2026-09-18-last-good-card-snapshot.md), [UI reconstruction](project-state/2026-09-18-field-proven-ui-reconstruction.md), [product adapter](project-state/2026-09-18-product-state-adapter.md), [admin foundation](project-state/2026-09-18-admin-cockpit-foundation.md), and [visual states](project-state/2026-09-18-premium-instrument-visual-states.md): implementation history, not exhaustive current capability statements.
- [Sites recovery incident](project-state/2026-09-19-sites-ownership-recovery.md): superseded hosting checkpoint; preserve the incident record.
- [2026-09-28 hardening](audit/2026-09-28-hardening.md): candidate history and diagnostic experiments. Later integration does not retroactively prove its hardware gates.
- [beta.2](releases/2026-09-29-beta-2.md): historical email/trial release.
- [rc.1](releases/2026-09-30-rc-1.md): reliability work; email/trial instructions are superseded by open beta.
- [OLED landing brief](product/2026-09-16-premium-oled-landing-brief.md): dated design direction; use the roadmap/current UI for new work.

Historical timeout/version/source values describe those documents' dates. Do not copy an old deployment SHA, policy or unverified promise into the current product. Keep the original golden artifact unchanged. Update current documents with new source/evidence; retain dated release/field records rather than silently rewriting their history.
