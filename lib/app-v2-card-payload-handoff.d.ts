export type AppV2CompletedCardPayloadResult = Readonly<{
  status: "accepted" | "rejected_payload" | "parser_error" | "rejected_parser_result" | "rejected_invalid" | "rejected_incomplete" | "storage_unavailable" | "storage_error";
  card: Readonly<Record<string, unknown>> | null;
  snapshot: Readonly<Record<string, unknown>> | null;
}>;

export declare function handoffCompletedCardPayload(input?: Readonly<{
  payload?: ArrayBuffer | ArrayBufferView | null;
  parseCard?: (payload: Uint8Array) => Promise<Readonly<Record<string, unknown>>> | Readonly<Record<string, unknown>>;
  storage?: {
    setItem: (key: string, value: string) => void;
  } | null;
  capturedAtIso?: string;
}>): Promise<AppV2CompletedCardPayloadResult>;
