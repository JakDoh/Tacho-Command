export type FieldProvenActivity = "DRIVING" | "WORK" | "AVAILABILITY" | "REST" | "UNKNOWN";
export type FieldProvenContinuousBand = "neutral" | "safe" | "warning" | "limit";
export type FieldProvenTimelineKind = "drive" | "work" | "availability" | "rest";

export type FieldProvenHistoryDay = Readonly<{
  dateLabel: string;
  drivingMinutes: number;
  segments: readonly Readonly<{
    kind: FieldProvenTimelineKind;
    percent: number;
  }>[];
}>;

export type FieldProvenProductState = Readonly<{
  live: boolean;
  driverName: string | null;
  cardLast4: string | null;
  tachographLabel: string | null;
  lastLiveReadLabel: string | null;
  currentActivity: FieldProvenActivity;
  continuousDrivingMinutes: number | null;
  continuousProgressPercent: number | null;
  continuousRemainingLabel: string | null;
  continuousThresholdLabel: string | null;
  continuousBand: FieldProvenContinuousBand;
  todayDrivingMinutes: number | null;
  weekDrivingMinutes: number | null;
  fortnightDrivingMinutes: number | null;
  historyDaysAvailable: number;
  historyDays: readonly FieldProvenHistoryDay[];
  attentionTitle: string | null;
  attentionBody: string | null;
  cardReadComplete: boolean;
  slotLabel: string | null;
  telemetrySentCount: number | null;
  attemptCode: string | null;
  localeLabel: string;
}>;

export declare function createFieldProvenProductState(input?: Readonly<{
  live?: Readonly<Record<string, unknown>>;
  card?: Readonly<Record<string, unknown>>;
  profile?: Readonly<{
    continuousThresholdMinutes?: number | null;
    continuousWarningMinutes?: number | null;
  }>;
  localeLabel?: string | null;
}>): FieldProvenProductState;

export declare function createFieldProvenLiveSnapshot(
  input?: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>>;
