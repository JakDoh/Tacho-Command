import assert from "node:assert/strict";
import test from "node:test";
import { readCoreDriverTelemetry } from "../lib/tacho-live.js";

const framedPositive = (did, ...data) => [1, 1, 0x62, (did >> 8) & 0xff, did & 0xff, ...data];

test("reads only the minimal core driver DID set in order", async () => {
  const seen = [];
  const pauses = [];
  const replies = new Map([
    [0xf903, framedPositive(0xf903, 0x03)],
    [0xf923, framedPositive(0xf923, 0x01, 0x0e)],
    [0xf925, framedPositive(0xf925, 0x00, 0x2d)],
    [0xf99a, framedPositive(0xf99a, 0x02, 0x1c)],
    [0xf99b, framedPositive(0xf99b, 0x08, 0x34)],
  ]);

  const sendUds = async (request) => {
    assert.equal(request[0], 0x22);
    const did = (request[1] << 8) | request[2];
    seen.push(did);
    return replies.get(did) ?? null;
  };

  const result = await readCoreDriverTelemetry(sendUds, 2000, {
    sleepImpl: async (ms) => pauses.push(ms),
  });

  assert.deepEqual(seen, [0xf903, 0xf923, 0xf925, 0xf99a, 0xf99b]);
  assert.deepEqual(pauses, [350, 350, 350, 350]);
  assert.equal(result.activity, "drive");
  assert.equal(result.continuousDrivingSeconds, 270 * 60);
  assert.equal(result.cumulativeBreakSeconds, 45 * 60);
  assert.equal(result.dailyDrivingSeconds, 540 * 60);
  assert.equal(result.weeklyDrivingSeconds, 2100 * 60);
  assert.deepEqual(result.capabilities, { dailyDriving: true, weeklyDriving: true });
});

test("keeps optional daily and weekly values unavailable without corrupting mandatory core", async () => {
  const sendUds = async (request) => {
    const did = (request[1] << 8) | request[2];
    if (did === 0xf903) return framedPositive(did, 0x00);
    if (did === 0xf923) return framedPositive(did, 0x00, 0x1e);
    if (did === 0xf925) return framedPositive(did, 0x00, 0x0f);
    return [1, 1, 0x7f, 0x22, 0x31];
  };

  const result = await readCoreDriverTelemetry(sendUds, 2000, {
    interDidDelayMs: 0,
  });

  assert.equal(result.activity, "rest");
  assert.equal(result.continuousDrivingSeconds, 30 * 60);
  assert.equal(result.cumulativeBreakSeconds, 15 * 60);
  assert.equal(result.dailyDrivingSeconds, null);
  assert.equal(result.weeklyDrivingSeconds, null);
  assert.deepEqual(result.capabilities, { dailyDriving: false, weeklyDriving: false });
});
