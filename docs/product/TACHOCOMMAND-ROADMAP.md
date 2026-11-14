# TachoCommand product roadmap

Updated: 2026-10-01. Planning baseline: `2026.09.30-beta.3`, source `62220e78a161a6ec07e2f7cfdc5f651982cc4d00`.

**Direction:** accurate, useful functions for professional drivers, with a clear view of their day. The owner prefers focused development and real vehicle tests during stationary breaks over starting another business or conducting door-to-door problem interviews.

This is proposed future work, not an implemented feature list, legal certification, fixed deadline or authorization to deploy. The [canonical state](../project-state/TACHOCOMMAND-CANONICAL-STATE.md) remains the implementation/evidence checkpoint.

## Non-negotiable foundations

- Golden 0.32c protocol/reference stays locked; no speculative BLE changes in product/UI tasks.
- Preserve UTC and source evidence; local labels must not change elapsed durations.
- Missing intervals remain unknown. Never manufacture rest, zero time or a compliance pass.
- Continue open free beta until a separately authorized access/pricing change. The old 72-hour policy is not a future commitment.
- Preserve domains, hosting control, data boundaries and prior good snapshots.
- Use one coherent change per PR with appropriate source and physical checks.

## Ordered work

| Priority | Proposed package | Acceptance gate |
| --- | --- | --- |
| 1 | **Detailed-day integrity**: fix `TC-DATA-01`, `TC-TIME-02`, `TC-EVENT-03` | Unknown intervals keep aggregates explicitly partial; repeated DST intervals are distinguishable; real card-status changes survive unknown activity. Complete ordinary days retain their totals. No BLE changes. |
| 2 | **Readable day inspection**: stronger activity contrast, zoom, pan and segment selection | Usable on Samsung A54 portrait screen; keyboard/touch access; full day and focused periods retain exact UTC/elapsed values; gaps are visibly unknown. |
| 3 | **Independent accuracy evidence** | Compare the same authorized raw card record with an independent reader and source records; explain discrepancies, record model/firmware/browser/build; no unsupported universal-accuracy claim. |
| 4 | **First-use and recovery** | Literal pairing steps, permissions recovery, useful localized error actions and retry; successful return after cancellation/disconnect. No hidden protocol replacement. |
| 5 | **Release/support readiness** | Installed-PWA update, background/foreground, shared-phone/card replacement and origin changes verified; telemetry delivery/retention/admin observed; operator/privacy details reviewed. |
| 6 | **Measured introduction and commercial release** | Clear compatibility and trial offer, bounded promotion test, measurable opens/reads/return use; pricing, payment and access behavior separately specified and approved. |

Priority 1 should be the next focused engineering task. The roadmap does not bundle all priorities into that task.

## Proposed day-inspection design

On the current dark background, test this owner-proposed palette before adopting it:

| Activity | Proposed color | Additional cue |
| --- | --- | --- |
| Driving | White | Driving icon and text |
| Break/rest | Soft blue | Bed icon and text |
| Work | Yellow | Hammer icon and text |
| Availability | Purple | Availability icon and text |
| Unknown interval | Neutral gray/hatching | Explicit unknown label |

Color is not the only activity cue. Verify contrast with the actual background and small segments. The proposed palette is not the current palette.

Zoom should move from a whole day to a few hours and individual intervals. Add appropriate hour/half-hour/quarter-hour ticks for the selected scale, accessible segment selection, start/end labels and elapsed duration. Preserve a visible read cutoff. A repeated hour must retain offset/order information; a 23/25-hour local day must not become a false 24-hour duration.

Retain daily driving/work/availability/rest totals, date navigation and newest-first history. Total rest includes off-duty time; it is not automatically a qualifying legal break or proof of daily rest. Do not relabel it as one.

## Physical-test workflow

Prepare one concrete hypothesis and expected result before a run. Record actual result, device/firmware, phone/browser, build and technical attempt code. Test stationary; use consented cards and keep raw personal data local unless explicitly shared. A failed attempt provides evidence, not an automatic reason to change the protocol.

After source regressions pass, check ordinary read, LIVE-to-card handoff, cancellation and retry, loss of connection, card A/card B isolation, and installed-PWA update when affected by the change. Source-only UI changes can first be verified with saved authorized data. Independent software is a comparison, not an unquestionable authority: investigate mismatches against the raw record.

## Business hypothesis, not forecast

The owner's initial scenario is 100 people seeing the product, some trying it, and perhaps three becoming paying users, with satisfied drivers recommending it. These are unvalidated assumptions. More compatible tachographs can expand the potential audience; proportional sales growth is not established.

Use clear demonstrations and self-service discovery rather than requiring the owner to visit customers individually. Current analytics does not yet prove unique people, retention or paid conversion; define privacy-appropriate measurements before drawing funnel conclusions. No revenue promise or advertising budget is implied.

## Deferred research

Speed history and persistent LIVE during driving are deliberately set aside. Revisit only in a separately scoped investigation of documented access, permissions, actual data and hardware evidence. Do not infer historical speeds from activity intervals or replace missing tachograph values with unlabeled phone GPS.

Broader hardware/iPhone support, full infringement analysis, signed DDD validation/export and cloud card accounts require separate evidence and design; they are not launch prerequisites by default or claimed near-term deliveries.
