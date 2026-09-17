# Golden field evidence — 2026-09-16

> **GOLDEN FIELD EVIDENCE — DO NOT EDIT OR REFORMAT THE HTML ARTIFACT.**

This directory preserves the first field-proven TachoCommand path that completed end-to-end communication with a physical tachograph and downloaded the driver card without an application/protocol error.

## Preserved artifact

- File: [TachoCommand-0.32c-driver-card-slot1-field-test.html](./TachoCommand-0.32c-driver-card-slot1-field-test.html)
- App version: `0.32c-driver-card-slot1-single-shot`
- Source baseline: `708fc3cb6d117da7cade478eb29cd0d8320ff776`
- Size: `21,561 bytes`
- SHA-256: `cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908`

The HTML file is preserved byte-for-byte. The automated test in `tests/field-evidence.test.mjs` fails if the artifact is changed, truncated, replaced, or removed.

## Physical field result

| Item | Confirmed result |
|---|---|
| Date | 2026-09-16 |
| Tachograph | Continental VDO DTCO-W-5065LO; DTCO 4.1a / GEN2 V2 |
| Transport | Web Bluetooth, BLE FIFO/Credits |
| Download request | Direct Driver Card Slot 1, TREP 06 |
| Request policy | No TREP 00, no TREP 31, no automatic retry |
| Pending response | NRC 0x78 handled by waiting without retransmitting |
| Transfer | 269 submessages; 67,295 bytes |
| Parsed envelope | 61 TLV objects |
| Close sequence | RequestTransferExit POSITIVE; StopCommunication POSITIVE; BLE flow-control closed with 0xFF |
| Saved field file | `TachoCommand-driver-card-20260916-074641.ddd` |
| Offline analysis | Gen2 v2; 217 daily records; full 56-day coverage |

The observed log ended with:

```text
PASS: Driver Card transfer kompletan: 269 submessage, 67295 B; TLV objekata 61.
PASS: DDP RequestTransferExit: POSITIVE.
PASS: DDP StopCommunication: POSITIVE.
PASS: 0.32c PASS — driver kartica je preuzeta preko VU.
```

## Proven sequence

1. Connect to the tachograph over BLE and establish FIFO/Credits flow control.
2. Start DDP communication.
3. Start diagnostic session `0x81`.
4. Request upload.
5. Send exactly one Driver Card Slot 1 request: TREP 06.
6. Treat NRC `0x78` as pending; keep waiting and do not retransmit.
7. Assemble all received card submessages in order.
8. Complete RequestTransferExit and StopCommunication.
9. Close BLE flow control with `0xFF`.
10. Save the candidate `.ddd` only after the complete transfer.

## Safety and privacy boundary

The raw `.ddd` file is deliberately **not committed** because it may contain driver-card identity and activity data. This repository stores the exact executable field candidate and sanitized proof of the successful transport result. The tachograph and signed source data remain authoritative.

## Restoration rule

When production download behavior is changed, compare it against this artifact before field testing. Do not “clean up,” modernize, or overwrite the golden HTML. New experiments must be added as separate artifacts with their own date, hash, and evidence record.
