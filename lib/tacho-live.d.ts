export type CoreDriverTelemetry = Readonly<{
  activity: "rest" | "available" | "work" | "drive" | "unknown";
  activityValid: boolean;
  continuousDrivingSeconds: number | null;
  cumulativeBreakSeconds: number | null;
  dailyDrivingSeconds: number | null;
  weeklyDrivingSeconds: number | null;
  capabilities: Readonly<{
    dailyDriving: boolean;
    weeklyDriving: boolean;
  }>;
}>;

export function readCoreDriverTelemetry(
  sendUds: (payload: readonly number[], timeoutMs?: number) => Promise<readonly number[] | null>,
  timeoutMs?: number,
): Promise<CoreDriverTelemetry>;
