import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpenRhmiStartRequest,
  buildOpenRhmiStatusRequest,
  classifyOpenRhmiPacket,
  describeRhmiStatus,
} from "../lib/tacho-rhmi.js";

test("builds the published Open Remote HMI routine requests", () => {
  assert.deepEqual(buildOpenRhmiStartRequest(), [0x31, 0x01, 0xf2, 0x11]);
  assert.deepEqual(buildOpenRhmiStatusRequest(), [0x31, 0x03, 0xf2, 0x11]);
});

test("classifies F211 start and status responses without retaining raw bytes", () => {
  const start = classifyOpenRhmiPacket([1, 1, 0x71, 0x01, 0xf2, 0x11]);
  assert.equal(start.responseType, "start-positive");
  assert.equal(start.routineIdentifier, "F211");
  assert.equal("rawBytes" in start, false);

  const status = classifyOpenRhmiPacket([1, 1, 0x71, 0x03, 0xf2, 0x11, 0x10]);
  assert.equal(status.responseType, "status-positive");
  assert.equal(status.statusCode, 0x10);
  assert.equal(describeRhmiStatus(status.statusCode), "open");
});

test("classifies RoutineControl negative responses", () => {
  const result = classifyOpenRhmiPacket([1, 1, 0x7f, 0x31, 0x22]);
  assert.equal(result.responseType, "negative");
  assert.equal(result.negativeResponseCode, 0x22);
});
