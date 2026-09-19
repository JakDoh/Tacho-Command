# App V2 full-card physical field proof — 2026-09-19

## Status

**PASS — physical DTCO run completed successfully.**

This document records the first successful physical validation of the App V2 golden-compatible full-card transport + canonical parser chain after PR #83.

The run was performed from an isolated HTTPS field harness built from the merged App V2 transport/protocol/parser logic. The production TachoCommand domain was not changed for this test.

## Physical result

Observed on the real DTCO/card run:

- transport: `golden-compatible-0.32c`
- status: `PHYSICAL RUN PASS`
- transport + parser: completed
- BLE teardown: completed cleanly
- payload size: **67,295 bytes**
- transfer submessages: **269**
- top-level TLV objects: **61**
- activity generation: **Gen2**
- activity source tag: **050402**
- parsed daily records: **217**
- retained calendar window: **56 / 56 days**
- retained range: **2026-07-26 through 2026-09-19**
- local payload SHA-256: `b2c80830f253a385bd727a82d01bc3a0d06d424a27da10db7925e1ddb9e9b10c`

The raw card payload was not uploaded or committed.

## Structural comparison with the preserved 0.32c proof

The new App V2 physical run reproduced the same key structural fingerprint as the preserved 2026-09-16 golden proof:

- 67,295-byte complete card payload
- 269 transfer submessages
- 61 top-level TLV objects
- Gen2 Driver_Activity_Data at tag `050402`
- 217 parsed daily records
- complete 56-day retained calendar window
- orderly transfer exit, communication stop and BLE close

The retained date window advanced naturally from the earlier proof because the card was read again on 2026-09-19.

The new local payload hash is therefore expected to differ from the older field payload hash; equality of raw card hashes is not a requirement across different read dates.

## Source-equivalence audit

The isolated field harness was compared against `main` after the successful run.

### Protocol core

Equivalent behavior:

- identical StartCommunication bytes
- identical StartDiagnosticSession 0x81 bytes
- identical RequestUpload bytes
- identical single Driver Card Slot 1 TREP06 bytes
- identical RequestTransferExit bytes
- identical StopCommunication bytes
- identical checksum rule
- identical DDP frame validation
- identical NRC 0x78 wait-without-retransmission behavior
- identical multipart counter and ACK progression
- identical TLV completion gate

### Browser transport

Equivalent operational path:

- same Smart Tacho Download service UUID
- same FIFO characteristic UUID
- same Credits characteristic UUID
- same initial/server credit behavior
- same ordered ITS assembly
- same 100 ms P3 guard
- same 20-minute card idle timeout
- same one-shot TREP06 policy
- same recovery abort ACK `FFFF`
- same TransferExit / StopCommunication teardown
- same final BLE flow-control close `0xFF`

Harness-only differences were observational/non-semantic:

- visible `onStage` progress callbacks
- direct browser Bluetooth acquisition inside the harness instead of the production injection wrapper
- the harness requested only the Download service as an optional service; production requests the existing optional-service superset and then selects the same Download service by UUID

### Canonical parser

Equivalent parsing behavior:

- same strict 3-byte tag + 2-byte length top-level TLV framing
- same Gen2 `050402` preference with Gen1 `050400` fallback
- same circular Driver_Activity_Data traversal
- same previous-record-length chain validation
- same strict duplicate/non-monotonic minute rejection
- same ActivityChangeInfo bit interpretation
- same no-invented-activity behavior for card-out / unknown-following intervals
- same normalized segment boundaries

The harness additionally displayed TLV count and the retained 56-day calendar range. The main product pipeline already applies the retained-window contiguity gate in `app-v2-parser-card-adapter.js`.

## Field-proven scope

This proof supports marking the App V2 full-card transport/parser path as **field-proven for the tested physical path**:

- Continental VDO DTCO 4.1a
- Smart Tacho 2 / GEN2 V2
- Android Chrome / Web Bluetooth
- Driver Card Slot 1
- Download service BLE FIFO/Credits path
- full-card one-shot TREP06 flow
- canonical App V2 activity parser

It does not expand compatibility claims to untested tachograph models, browsers, operating systems, cryptographic signature validation, certificate trust validation, or legal/infringement conclusions.

## Preserved invariant

The original golden 0.32c artifact remains byte-for-byte unchanged and continues to be the immutable transport reference.
