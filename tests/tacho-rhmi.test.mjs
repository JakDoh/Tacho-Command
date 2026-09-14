import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpenRhmiStartRequest,
  buildOpenRhmiStatusRequest,
  classifyOpenRhmiPacket,
  describeRhmiStatus,
  parseDriverMinutesDid,
  parseDriverWorkingState,
  RHMI_DIDS,
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

test("uses the ISO 16844-7 core driver DID registry", () => {
  assert.equal(RHMI_DIDS.TACHOGRAPH_VEHICLE_SPEED, 0xf902);
  assert.equal(RHMI_DIDS.DRIVER_1_WORKING_STATE, 0xf903);
  assert.equal(RHMI_DIDS.DRIVER_1_CONTINUOUS_DRIVING, 0xf923);
  assert.equal(RHMI_DIDS.DRIVER_1_CUMULATIVE_BREAK, 0xf925);
  assert.equal(RHMI_DIDS.DRIVER_1_CURRENT_DAILY_DRIVING, 0xf99a);
  assert.equal(RHMI_DIDS.DRIVER_1_CURRENT_WEEKLY_DRIVING, 0xf99b);
});

test("parses F903 as working state only", () => {
  const parsed = parseDriverWorkingState([1, 1, 0x62, 0xf9, 0x03, 0x03]);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.activity, "drive");
  assert.equal(parsed.activityCode, 3);
  assert.equal("continuousDrivingMinutes" in parsed, false);
  assert.equal("continuousDrivingSeconds" in parsed, false);
});

test("parses proven two-byte minute DIDs conservatively", () => {
  assert.deepEqual(parseDriverMinutesDid([1, 1, 0x62, 0xf9, 0x23, 0x01, 0x0e], 0xf923), { valid: true, minutes: 270, raw: 270 });
  assert.deepEqual(parseDriverMinutesDid([1, 1, 0x62, 0xf9, 0x25, 0x00, 0x2d], 0xf925), { valid: true, minutes: 45, raw: 45 });
  assert.equal(parseDriverMinutesDid([1, 1, 0x62, 0xf9, 0x23, 0xff, 0xff], 0xf923).valid, false);
  assert.equal(parseDriverMinutesDid([1, 1, 0x62, 0xf9, 0x25, 0x00, 0x2d], 0xf923).valid, false);
});
