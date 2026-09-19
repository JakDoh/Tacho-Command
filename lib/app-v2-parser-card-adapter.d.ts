export type AppV2ParserCardSegment = Readonly<{
  activity?: "rest" | "availability" | "work" | "driving" | "drive";
  kind?: "rest" | "availability" | "work" | "driving" | "drive";
  startMinute: number;
  endMinute: number;
  cardStatus?: "inserted" | "not-inserted" | null;
  label?: string | null;
}>;

export type AppV2ParserCardDay = Readonly<{
  date?: string;
  dateIso?: string;
  dateLabel?: string | null;
  segments: readonly AppV2ParserCardSegment[];
}>;

export declare function normalizeParserCardResult(input?: Readonly<{
  complete?: boolean;
  driverName?: string | null;
  cardLast4?: string | number | null;
  slotLabel?: string | null;
  attentionTitle?: string | null;
  attentionBody?: string | null;
  days?: readonly AppV2ParserCardDay[];
}>): Readonly<Record<string, unknown>> | null;
