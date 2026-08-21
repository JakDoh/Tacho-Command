import test from "node:test";
import assert from "node:assert/strict";
import {
  DDP_PHASES,
  DDP_REQUEST_DRIVER_CARD_SLOT_1,
  DDP_REQUEST_OVERVIEW,
  DDP_REQUEST_TRANSFER_EXIT,
  DDP_REQUEST_UPLOAD,
  DDP_START_COMMUNICATION_REQUEST,
  DDP_START_DIAGNOSTIC_SESSION_REQUEST,
  DDP_STOP_COMMUNICATION_REQUEST,
  advanceDdpSession,
  classifyDdpPacket,
  createDdpSession,
  getDdpTeardownMessages,
} from "../lib/tacho-download.js";

test("builds the Appendix 7 DDP open and close messages with checksums", () => {
  assert.deepEqual(DDP_START_COMMUNICATION_REQUEST, [0x81, 0xee, 0xf0, 0x81, 0xe0]);
  assert.deepEqual(DDP_START_DIAGNOSTIC_SESSION_REQUEST, [0x80, 0xee, 0xf0, 0x02, 0x10, 0x81, 0xf1]);
  assert.deepEqual(DDP_STOP_COMMUNICATION_REQUEST, [0x80, 0xee, 0xf0, 0x01, 0x82, 0xe1]);
});

test("builds the complete bounded Appendix 7 card-download request sequence", () => {
  assert.deepEqual(DDP_REQUEST_UPLOAD, [0x80, 0xee, 0xf0, 0x0a, 0x35, 0, 0, 0, 0, 0, 0xff, 0xff, 0xff, 0xff, 0x99]);
  assert.deepEqual(DDP_REQUEST_OVERVIEW, [0x80, 0xee, 0xf0, 0x02, 0x36, 0x01, 0x97]);
  assert.deepEqual(DDP_REQUEST_DRIVER_CARD_SLOT_1, [0x80, 0xee, 0xf0, 0x03, 0x36, 0x06, 0x01, 0x9e]);
  assert.deepEqual(DDP_REQUEST_TRANSFER_EXIT, [0x80, 0xee, 0xf0, 0x01, 0x37, 0x96]);
});

test("advances only through the complete ordered DDP session", () => {
  let session = createDdpSession();
  const positives = [
    { type: "positive", sid: 0xc1 },
    { type: "positive", sid: 0x50 },
    { type: "positive", sid: 0x75 },
    { type: "positive", sid: 0x76, trep: 0x01 },
    { type: "positive", sid: 0x76, trep: 0x06 },
    { type: "positive", sid: 0x77 },
    { type: "positive", sid: 0xc2 },
  ];
  for (const event of positives) session = advanceDdpSession(session, event);
  assert.equal(session.status, "complete");
  assert.equal(session.phaseIndex, DDP_PHASES.length);
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
