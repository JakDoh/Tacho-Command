import test from "node:test";
import assert from "node:assert/strict";
import { DDP_START_COMMUNICATION_REQUEST, DDP_STOP_COMMUNICATION_REQUEST, classifyDdpPacket } from "../lib/tacho-download.js";

test("builds the Appendix 7 DDP open and close messages with checksums", () => {
  assert.deepEqual(DDP_START_COMMUNICATION_REQUEST, [0x81, 0xee, 0xf0, 0x81, 0xe0]);
  assert.deepEqual(DDP_STOP_COMMUNICATION_REQUEST, [0x80, 0xee, 0xf0, 0x01, 0x82, 0xe1]);
});

test("classifies only addressed and checksum-valid DDP responses", () => {
  const start = classifyDdpPacket([1, 1, 0x80, 0xf0, 0xee, 0x03, 0xc1, 0xea, 0x8f, 0x9b], 0x81);
  assert.equal(start.positive, true);
  assert.equal(classifyDdpPacket([1, 1, 0x80, 0xf0, 0xee, 0x03, 0xc1, 0xea, 0x8f, 0x00], 0x81).positive, false);
  const negative = classifyDdpPacket([1, 1, 0x80, 0xf0, 0xee, 0x03, 0x7f, 0x81, 0x22, 0x83], 0x81);
  assert.equal(negative.negative, true);
  assert.equal(negative.negativeResponseCode, 0x22);
});
