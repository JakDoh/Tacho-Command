export type AppV2CardPipelineResult = Readonly<{
  status: "accepted" | "rejected_parser_result" | "rejected_invalid" | "rejected_incomplete" | "storage_unavailable" | "storage_error";
  card: Readonly<Record<string, unknown>> | null;
  snapshot: Readonly<Record<string, unknown>> | null;
}>;

export declare function processAppV2ParsedCard(input?: Readonly<{
  storage?: {
    setItem: (key: string, value: string) => void;
  } | null;
  parserResult?: Readonly<Record<string, unknown>> | null;
  capturedAtIso?: string;
}>): AppV2CardPipelineResult;
