export type RuleStatus = "safe" | "warning" | "limit" | "exceeded";
export type DrivingSnapshot = {
  continuousDriveSeconds?: number;
  dailyDriveSeconds?: number;
  weeklyDriveSeconds?: number;
  fortnightlyDriveSeconds?: number;
  currentBreakSeconds?: number;
  previousSplitBreakSeconds?: number;
  useDailyExtension?: boolean;
};
export type RuleResult = Readonly<{
  id: "continuous-driving" | "daily-driving" | "weekly-driving" | "fortnightly-driving";
  article: string;
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  status: RuleStatus;
}>;
export type DrivingEvaluation = Readonly<{
  rulesetId: string;
  scope: string;
  breakQualified: boolean;
  rules: readonly RuleResult[];
}>;
export const RULESET_ID: string;
export const SECOND: number;
export const MINUTE: number;
export const HOUR: number;
export const ruleLimits: Readonly<Record<string, number>>;
export function evaluateDrivingSnapshot(snapshot?: DrivingSnapshot): DrivingEvaluation;
