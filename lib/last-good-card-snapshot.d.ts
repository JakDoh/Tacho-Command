export declare const LAST_GOOD_CARD_SNAPSHOT_SCHEMA: "tc-card-snapshot-v1";
export declare const LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY: "tachocommand.last-good-card-snapshot.v1";
export declare const LAST_GOOD_CARD_SNAPSHOT_MAX_DAYS: 56;

export type LastGoodCardHistorySegment = Readonly<{
  kind: "drive" | "work" | "availability" | "rest";
  minutes: number;
  startMinute?: number | null;
  endMinute?: number | null;
  cardStatus?: "inserted" | "not-inserted" | null;
  label?: string | null;
}>;

export type LastGoodCardHistoryEvent = Readonly<{
  kind: "card-inserted" | "card-removed";
  minute: number;
}>;

export type LastGoodCardHistoryDay = Readonly<{
  dateIso: string | null;
  dateLabel: string;
  drivingMinutes: number;
  segments: readonly LastGoodCardHistorySegment[];
  events?: readonly LastGoodCardHistoryEvent[];
  cardInsertedMinute?: number | null;
  cardRemovedMinute?: number | null;
}>;

export type LastGoodCardState = Readonly<{
  driverName: string | null;
  cardLast4: string | null;
  cardReadComplete: true;
  historyDaysAvailable: number;
  fortnightDrivingMinutes: number | null;
  historyDays: readonly LastGoodCardHistoryDay[];
  historyRangeStartIso: string | null;
  historyRangeEndIso: string | null;
  attentionTitle: string | null;
  attentionBody: string | null;
  slotLabel: string | null;
}>;

export type LastGoodCardSnapshot = Readonly<{
  schema: typeof LAST_GOOD_CARD_SNAPSHOT_SCHEMA;
  capturedAtIso: string;
  card: LastGoodCardState;
}>;

export declare function createLastGoodCardSnapshot(
  cardState: Readonly<Record<string, unknown>>,
  capturedAtIso?: string,
): LastGoodCardSnapshot | null;

export declare function saveLastGoodCardSnapshot(
  storage: Pick<Storage, "setItem"> | null | undefined,
  cardState: Readonly<Record<string, unknown>>,
  capturedAtIso?: string,
): Readonly<{
  status: "saved" | "rejected_incomplete" | "storage_unavailable" | "storage_error";
  snapshot: LastGoodCardSnapshot | null;
}>;

export declare function loadLastGoodCardSnapshot(
  storage: Pick<Storage, "getItem"> | null | undefined,
): LastGoodCardSnapshot | null;

export declare function cardStateFromLastGoodCardSnapshot(
  snapshot: LastGoodCardSnapshot | Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null;
