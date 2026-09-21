export type AppV2CanonicalCardSegment = Readonly<{
  activity: "rest" | "availability" | "work" | "driving";
  startMinute: number;
  endMinute: number;
  cardStatus: "inserted" | "not-inserted";
}>;

export type AppV2CanonicalCardDay = Readonly<{
  date: string;
  segments: readonly AppV2CanonicalCardSegment[];
}>;

export type AppV2CanonicalCardParseResult = Readonly<{
  complete: true;
  generation: "gen1" | "gen2";
  sourceTag: "050400" | "050402";
  driverName: string | null;
  cardLast4: string | null;
  days: readonly AppV2CanonicalCardDay[];
}>;

export declare function parseAppV2CardPayload(
  input: ArrayBuffer | ArrayBufferView,
): AppV2CanonicalCardParseResult;
