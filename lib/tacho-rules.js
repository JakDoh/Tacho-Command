export const RULESET_ID = "EU-561-2006-standard-v0.2";
export const SECOND = 1;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

const LIMITS = Object.freeze({
  continuousDriving: 4 * HOUR + 30 * MINUTE,
  dailyDrivingStandard: 9 * HOUR,
  dailyDrivingExtended: 10 * HOUR,
  weeklyDriving: 56 * HOUR,
  fortnightlyDriving: 90 * HOUR,
  fullBreak: 45 * MINUTE,
  splitBreakFirst: 15 * MINUTE,
  splitBreakSecond: 30 * MINUTE,
  warningWindow: 30 * MINUTE,
});

function seconds(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function statusFor(remainingSeconds) {
  if (remainingSeconds < 0) return "exceeded";
  if (remainingSeconds === 0) return "limit";
  if (remainingSeconds <= LIMITS.warningWindow) return "warning";
  return "safe";
}

function result(id, article, usedSeconds, limitSeconds) {
  const remainingSeconds = limitSeconds - usedSeconds;
  return Object.freeze({
    id,
    article,
    usedSeconds,
    limitSeconds,
    remainingSeconds,
    status: statusFor(remainingSeconds),
  });
}

export function evaluateDrivingSnapshot(snapshot = {}) {
  const currentBreakSeconds = seconds(snapshot.currentBreakSeconds);
  const previousSplitBreakSeconds = seconds(snapshot.previousSplitBreakSeconds);
  const breakQualified =
    currentBreakSeconds >= LIMITS.fullBreak ||
    (previousSplitBreakSeconds >= LIMITS.splitBreakFirst && currentBreakSeconds >= LIMITS.splitBreakSecond);
  const dailyLimit = snapshot.useDailyExtension
    ? LIMITS.dailyDrivingExtended
    : LIMITS.dailyDrivingStandard;

  return Object.freeze({
    rulesetId: RULESET_ID,
    scope: "Standard EU driving-time limits only; national working-time rules and temporary derogations are excluded.",
    breakQualified,
    rules: Object.freeze([
      result("continuous-driving", "Regulation (EC) 561/2006 Article 7", seconds(snapshot.continuousDriveSeconds), LIMITS.continuousDriving),
      result("daily-driving", "Regulation (EC) 561/2006 Article 6(1)", seconds(snapshot.dailyDriveSeconds), dailyLimit),
      result("weekly-driving", "Regulation (EC) 561/2006 Article 6(2)", seconds(snapshot.weeklyDriveSeconds), LIMITS.weeklyDriving),
      result("fortnightly-driving", "Regulation (EC) 561/2006 Article 6(3)", seconds(snapshot.fortnightlyDriveSeconds), LIMITS.fortnightlyDriving),
    ]),
  });
}

export const ruleLimits = LIMITS;
