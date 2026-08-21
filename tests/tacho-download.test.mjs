import test from "node:test";
import assert from "node:assert/strict";
import {
  DDP_PHASES,
  DDP_REQUEST_DRIVER_CARD_SLOT_1,
  DDP_REQUEST_OVERVIEW,
  DDP_REQUEST_OVERVIEW_GEN2,
  DDP_REQUEST_TRANSFER_EXIT,
  DDP_REQUEST_UPLOAD,
  DDP_START_COMMUNICATION_REQUEST,
  DDP_START_DIAGNOSTIC_SESSION_REQUEST,
  DDP_STOP_COMMUNICATION_REQUEST,
  advanceDdpSession,
  advanceDdpTeardown,
  buildDdpSubMessageAck,
  classifyDdpPacket,
  consumeClientCredit,
  consumeServerCredit,
  createBleCreditLedger,
  createDdpTransferAssembler,
  createDdpTeardown,
  createDdpSession,
  getDdpTeardownMessages,
  getDdpTeardownMessage,
  createItsMessageAssembler,
  parseDdpMessage,
  grantClientCredits,
  pushItsPacket,
  pushDdpSubMessage,
  receiveServerCredits,
} from "../lib/tacho-download.js";

const frame = (data) => {
  const message = [0x80, 0xf0, 0xee, data.length, ...data];
  return [...message, message.reduce((sum, byte) => (sum + byte) & 0xff, 0)];
};

test("builds the Appendix 7 DDP open and close messages with checksums", () => {
  assert.deepEqual(DDP_START_COMMUNICATION_REQUEST, [0x81, 0xee, 0xf0, 0x81, 0xe0]);
  assert.deepEqual(DDP_START_DIAGNOSTIC_SESSION_REQUEST, [0x80, 0xee, 0xf0, 0x02, 0x10, 0x81, 0xf1]);
  assert.deepEqual(DDP_STOP_COMMUNICATION_REQUEST, [0x80, 0xee, 0xf0, 0x01, 0x82, 0xe1]);
});

test("builds the complete bounded Appendix 7 card-download request sequence", () => {
  assert.deepEqual(DDP_REQUEST_UPLOAD, [0x80, 0xee, 0xf0, 0x0a, 0x35, 0, 0, 0, 0, 0, 0xff, 0xff, 0xff, 0xff, 0x99]);
  assert.deepEqual(DDP_REQUEST_OVERVIEW, [0x80, 0xee, 0xf0, 0x02, 0x36, 0x01, 0x97]);
  assert.deepEqual(DDP_REQUEST_OVERVIEW_GEN2, [0x80, 0xee, 0xf0, 0x02, 0x36, 0x21, 0xb7]);
  assert.deepEqual(DDP_REQUEST_DRIVER_CARD_SLOT_1, [0x80, 0xee, 0xf0, 0x03, 0x36, 0x06, 0x01, 0x9e]);
  assert.deepEqual(DDP_REQUEST_TRANSFER_EXIT, [0x80, 0xee, 0xf0, 0x01, 0x37, 0x96]);
});

test("advances only through the complete ordered DDP session", () => {
  let session = createDdpSession();
  const positives = [
    { type: "positive", sid: 0xc1 },
    { type: "positive", sid: 0x50 },
    { type: "positive", sid: 0x75 },
    { type: "positive", sid: 0x76, trep: 0x21 },
    { type: "positive", sid: 0x76, trep: 0x06 },
    { type: "positive", sid: 0x77 },
    { type: "positive", sid: 0xc2 },
  ];
  for (const event of positives) session = advanceDdpSession(session, event);
  assert.equal(session.status, "complete");
  assert.equal(session.phaseIndex, DDP_PHASES.length);
});

test("does not leave a transfer phase before its final sub-message", () => {
  let session = createDdpSession();
  session = { ...session, phaseIndex: 3 };
  session = advanceDdpSession(session, { type: "positive", sid: 0x76, trep: 0x21, complete: false });
  assert.equal(session.phaseIndex, 3);
  session = advanceDdpSession(session, { type: "positive", sid: 0x76, trep: 0x21, complete: true });
  assert.equal(session.phaseIndex, 4);
});

test("requires an ordered teardown after timeout and never pretends completion", () => {
  let session = createDdpSession();
  session = advanceDdpSession(session, { type: "positive", sid: 0xc1 });
  session = advanceDdpSession(session, { type: "positive", sid: 0x50 });
  session = advanceDdpSession(session, { type: "positive", sid: 0x75 });
  session = advanceDdpSession(session, { type: "timeout" });
  assert.equal(session.status, "teardown-required");
  assert.equal(session.failure.phase, "request-overview");
  assert.deepEqual(getDdpTeardownMessages(session), [DDP_REQUEST_TRANSFER_EXIT, DDP_STOP_COMMUNICATION_REQUEST]);
});

test("does not send transfer-exit when upload never started", () => {
  let session = createDdpSession();
  session = advanceDdpSession(session, { type: "positive", sid: 0xc1 });
  session = advanceDdpSession(session, { type: "timeout" });
  assert.deepEqual(getDdpTeardownMessages(session), [DDP_STOP_COMMUNICATION_REQUEST]);
});

test("classifies only addressed and checksum-valid DDP responses", () => {
  const start = classifyDdpPacket([1, 1, 0x80, 0xf0, 0xee, 0x03, 0xc1, 0xea, 0x8f, 0x9b], 0x81);
  assert.equal(start.positive, true);
  assert.equal(classifyDdpPacket([1, 1, 0x80, 0xf0, 0xee, 0x02, 0x50, 0x81, 0x31], 0x10).positive, true);
  assert.equal(classifyDdpPacket([1, 1, 0x80, 0xf0, 0xee, 0x03, 0xc1, 0xea, 0x8f, 0x00], 0x81).positive, false);
  const negative = classifyDdpPacket([1, 1, 0x80, 0xf0, 0xee, 0x03, 0x7f, 0x81, 0x22, 0x83], 0x81);
  assert.equal(negative.negative, true);
  assert.equal(negative.negativeResponseCode, 0x22);
});

test("reassembles ordered multi-packet ITS messages", () => {
  const assembler = createItsMessageAssembler();
  assert.equal(pushItsPacket(assembler, [3, 1, 0x80, 0xf0]).status, "pending");
  assert.equal(pushItsPacket(assembler, [0, 2, 0xee, 0x03]).status, "pending");
  const result = pushItsPacket(assembler, [0, 3, 0xc1, 0xea, 0x8f, 0x9b]);
  assert.equal(result.status, "complete");
  assert.deepEqual(result.message, [0x80, 0xf0, 0xee, 0x03, 0xc1, 0xea, 0x8f, 0x9b]);
  assert.equal(parseDdpMessage(result.message).sid, 0xc1);
});

test("rejects out-of-order ITS packets and resets the assembler", () => {
  const assembler = createItsMessageAssembler();
  pushItsPacket(assembler, [3, 1, 0x80]);
  const result = pushItsPacket(assembler, [0, 3, 0xf0]);
  assert.equal(result.status, "invalid");
  assert.equal(result.reason, "out-of-order");
  assert.equal(assembler.expectedPackets, 0);
});

test("rejects DDP messages with invalid length, checksum, or address", () => {
  assert.equal(parseDdpMessage([0x80, 0xf0, 0xee, 0x03, 0xc1, 0xea, 0x8f, 0x9b]).valid, true);
  assert.equal(parseDdpMessage([0x80, 0xf0, 0xee, 0x02, 0xc1, 0xea, 0x8f, 0x9b]).reason, "length-mismatch");
  assert.equal(parseDdpMessage([0x80, 0xf0, 0xee, 0x03, 0xc1, 0xea, 0x8f, 0]).reason, "checksum");
  assert.equal(parseDdpMessage([0x80, 0xee, 0xf0, 0x03, 0xc1, 0xea, 0x8f, 0x9b]).reason, "address");
});

test("builds Appendix 7 ACKs for every sub-message counter", () => {
  assert.deepEqual(buildDdpSubMessageAck(2), [0x80, 0xee, 0xf0, 0x04, 0x83, 0x76, 0x00, 0x02, 0x5d]);
  assert.deepEqual(buildDdpSubMessageAck(0x0100), [0x80, 0xee, 0xf0, 0x04, 0x83, 0x76, 0x01, 0x00, 0x5c]);
});

test("assembles a large DDP transfer and ACKs every sub-message", () => {
  const assembler = createDdpTransferAssembler(0x06);
  const firstPayload = Array.from({ length: 251 }, (_, index) => index & 0xff);
  const first = pushDdpSubMessage(assembler, frame([0x76, 0x06, 0x00, 0x01, ...firstPayload]));
  assert.equal(first.status, "pending");
  assert.deepEqual(first.ack, buildDdpSubMessageAck(2));
  const last = pushDdpSubMessage(assembler, frame([0x76, 0x06, 0x00, 0x02, 0xaa, 0xbb]));
  assert.equal(last.status, "complete");
  assert.deepEqual(last.ack, buildDdpSubMessageAck(3));
  assert.deepEqual(last.payload, [...firstPayload, 0xaa, 0xbb]);
});

test("handles an exact 255-byte final block followed by an empty terminator", () => {
  const assembler = createDdpTransferAssembler(0x06);
  const full = pushDdpSubMessage(assembler, frame([0x76, 0x06, 0x00, 0x01, ...new Array(251).fill(0x5a)]));
  assert.equal(full.status, "pending");
  const terminator = pushDdpSubMessage(assembler, frame([0x76, 0x06, 0x00, 0x02]));
  assert.equal(terminator.status, "complete");
  assert.equal(terminator.payload.length, 251);
});

test("does not duplicate data when a sub-message is retransmitted", () => {
  const assembler = createDdpTransferAssembler(0x06);
  const firstMessage = frame([0x76, 0x06, 0x00, 0x01, ...new Array(251).fill(0x11)]);
  pushDdpSubMessage(assembler, firstMessage);
  const duplicate = pushDdpSubMessage(assembler, firstMessage);
  assert.equal(duplicate.status, "duplicate");
  assert.deepEqual(duplicate.ack, buildDdpSubMessageAck(2));
  const last = pushDdpSubMessage(assembler, frame([0x76, 0x06, 0x00, 0x02, 0x22]));
  assert.equal(last.payload.length, 252);
});

test("requests the expected sub-message after checksum, TREP, or counter errors", () => {
  const assembler = createDdpTransferAssembler(0x06);
  const corrupt = frame([0x76, 0x06, 0x00, 0x01, 0xaa]);
  corrupt[corrupt.length - 1] ^= 0xff;
  assert.equal(pushDdpSubMessage(assembler, corrupt).reason, "checksum");
  assert.equal(pushDdpSubMessage(assembler, frame([0x76, 0x01, 0x00, 0x01])).reason, "trep-mismatch");
  const skipped = pushDdpSubMessage(assembler, frame([0x76, 0x06, 0x00, 0x02]));
  assert.equal(skipped.reason, "counter-mismatch");
  assert.deepEqual(skipped.ack, buildDdpSubMessageAck(1));
});

test("tracks additive BLE credits and blocks FIFO writes without one", () => {
  const ledger = createBleCreditLedger();
  assert.equal(consumeServerCredit(ledger).reason, "credit-exhausted");
  receiveServerCredits(ledger, 2);
  receiveServerCredits(ledger, 3);
  assert.equal(ledger.serverCredits, 5);
  for (let index = 0; index < 5; index += 1) assert.equal(consumeServerCredit(ledger).accepted, true);
  assert.equal(consumeServerCredit(ledger).reason, "credit-exhausted");
});

test("detects a tachograph that sends more FIFO packets than granted", () => {
  const ledger = createBleCreditLedger();
  grantClientCredits(ledger, 2);
  assert.equal(consumeClientCredit(ledger).accepted, true);
  assert.equal(consumeClientCredit(ledger).accepted, true);
  assert.equal(consumeClientCredit(ledger).reason, "peer-exceeded-credit");
  assert.equal(ledger.failure, "peer-exceeded-credit");
});

test("treats credit 0xFF as an immediate transport close", () => {
  const ledger = createBleCreditLedger();
  receiveServerCredits(ledger, 2);
  assert.equal(receiveServerCredits(ledger, 0xff).reason, "peer-disconnect");
  assert.equal(ledger.closed, true);
  assert.equal(consumeServerCredit(ledger).reason, "closed");
});

test("classifies NRC 0x78 as response-pending without treating it as success", () => {
  const pending = classifyDdpPacket([1, 1, ...frame([0x7f, 0x36, 0x78])], 0x36);
  assert.equal(pending.negative, true);
  assert.equal(pending.responsePending, true);
  assert.equal(pending.positive, false);
});

test("integrates BLE packet reassembly, additive credits, DDP sub-messages, and per-block ACKs", () => {
  const ledger = createBleCreditLedger();
  receiveServerCredits(ledger, 2);
  grantClientCredits(ledger, 2);
  const ddp = createDdpTransferAssembler(0x06);
  const acknowledgements = [];
  const received = [];

  const transmitMessage = (message) => {
    const mtuPayload = 18;
    const chunks = [];
    for (let offset = 0; offset < message.length; offset += mtuPayload) chunks.push(message.slice(offset, offset + mtuPayload));
    const its = createItsMessageAssembler();
    chunks.forEach((chunk, index) => {
      assert.equal(consumeClientCredit(ledger).accepted, true);
      grantClientCredits(ledger, 1);
      const packet = [index === 0 ? chunks.length : 0, index + 1, ...chunk];
      const assembled = pushItsPacket(its, packet);
      if (assembled.status === "complete") received.push(assembled.message);
    });
  };

  const payload1 = Array.from({ length: 251 }, (_, index) => index & 0xff);
  transmitMessage(frame([0x76, 0x06, 0x00, 0x01, ...payload1]));
  transmitMessage(frame([0x76, 0x06, 0x00, 0x02, 0xaa, 0xbb, 0xcc]));
  for (const message of received) {
    const result = pushDdpSubMessage(ddp, message);
    assert.equal(consumeServerCredit(ledger).accepted, true);
    acknowledgements.push(result.ack);
  }
  assert.deepEqual(acknowledgements, [buildDdpSubMessageAck(2), buildDdpSubMessageAck(3)]);
  assert.equal(ddp.complete, true);
  assert.equal(ddp.chunks.flat().length, 254);
  assert.equal(ledger.serverCredits, 0);
  assert.equal(ledger.clientCredits, 2);
});

test("response-pending followed by timeout enters ordered teardown", () => {
  let session = createDdpSession();
  session = { ...session, phaseIndex: 4 };
  session = advanceDdpSession(session, { type: "response-pending", requestSid: 0x36 });
  assert.equal(session.status, "running");
  session = advanceDdpSession(session, { type: "timeout" });
  assert.equal(session.status, "teardown-required");

  let teardown = createDdpTeardown(session);
  assert.deepEqual(getDdpTeardownMessage(teardown), DDP_REQUEST_TRANSFER_EXIT);
  teardown = advanceDdpTeardown(teardown, { type: "positive", sid: 0x77 });
  assert.equal(teardown.transferExitConfirmed, true);
  assert.deepEqual(getDdpTeardownMessage(teardown), DDP_STOP_COMMUNICATION_REQUEST);
  teardown = advanceDdpTeardown(teardown, { type: "positive", sid: 0xc2 });
  assert.equal(teardown.status, "complete");
  assert.equal(teardown.stopConfirmed, true);
});

test("teardown retries each request three times and still attempts StopCommunication", () => {
  let teardown = createDdpTeardown({ phaseIndex: 4, status: "teardown-required", failure: null });
  for (let attempt = 0; attempt < 3; attempt += 1) teardown = advanceDdpTeardown(teardown, { type: "timeout" });
  assert.equal(teardown.phase, "stop-communication");
  assert.equal(teardown.transferExitConfirmed, false);
  for (let attempt = 0; attempt < 3; attempt += 1) teardown = advanceDdpTeardown(teardown, { type: "timeout" });
  assert.equal(teardown.status, "failed");
  assert.equal(teardown.stopConfirmed, false);
});
