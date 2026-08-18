import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDrivingSnapshot, HOUR, MINUTE, RULESET_ID } from "../lib/tacho-rules.js";

const byId = (evaluation, id) => evaluation.rules.find((rule) => rule.id === id);

test("publishes a versioned and explicitly bounded rule set", () => {
  const evaluation = evaluateDrivingSnapshot();
  assert.equal(evaluation.rulesetId, RULESET_ID);
  assert.match(evaluation.scope, /national working-time rules.*excluded/i);
  assert.equal(evaluation.rules.length, 4);
});

test("continuous driving changes status at the warning and legal boundaries", () => {
  assert.equal(byId(evaluateDrivingSnapshot({ continuousDriveSeconds: 4 * HOUR }), "continuous-driving").status, "warning");
  assert.equal(byId(evaluateDrivingSnapshot({ continuousDriveSeconds: 4 * HOUR + 30 * MINUTE }), "continuous-driving").status, "limit");
  assert.equal(byId(evaluateDrivingSnapshot({ continuousDriveSeconds: 4 * HOUR + 30 * MINUTE + 1 }), "continuous-driving").status, "exceeded");
});

test("daily extension is explicit and changes only the daily limit", () => {
  const standard = byId(evaluateDrivingSnapshot({ dailyDriveSeconds: 9 * HOUR }), "daily-driving");
  const extended = byId(evaluateDrivingSnapshot({ dailyDriveSeconds: 9 * HOUR, useDailyExtension: true }), "daily-driving");
  assert.equal(standard.status, "limit");
  assert.equal(extended.limitSeconds, 10 * HOUR);
  assert.equal(extended.remainingSeconds, HOUR);
});

test("split break requires at least 15 minutes followed by at least 30", () => {
  assert.equal(evaluateDrivingSnapshot({ previousSplitBreakSeconds: 15 * MINUTE, currentBreakSeconds: 30 * MINUTE }).breakQualified, true);
  assert.equal(evaluateDrivingSnapshot({ previousSplitBreakSeconds: 30 * MINUTE, currentBreakSeconds: 15 * MINUTE }).breakQualified, false);
  assert.equal(evaluateDrivingSnapshot({ currentBreakSeconds: 45 * MINUTE }).breakQualified, true);
});

test("invalid and negative inputs are normalized without creating fake time", () => {
  const evaluation = evaluateDrivingSnapshot({
    continuousDriveSeconds: -100,
    dailyDriveSeconds: Number.NaN,
    weeklyDriveSeconds: Number.POSITIVE_INFINITY,
  });
  for (const rule of evaluation.rules) assert.equal(rule.usedSeconds, 0);
});
