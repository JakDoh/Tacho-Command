import type { AppV2CardSession } from "./app-v2-card-session.js";
import type { AppV2CompletedCardPayloadResult } from "./app-v2-card-payload-handoff.js";

export type AppV2CardReadControllerResult = Readonly<{
  status:
    | "accepted"
    | "read_unavailable"
    | "read_error"
    | "rejected_payload"
    | "parser_error"
    | "rejected_parser_result"
    | "rejected_invalid"
    | "rejected_incomplete"
    | "storage_unavailable"
    | "storage_error"
    | "session_rejected";
  session: AppV2CardSession | null;
  pipelineResult: AppV2CompletedCardPayloadResult | null;
}>;

export declare function runAppV2CardRead(input?: Readonly<{
  session?: Readonly<Record<string, unknown>>;
  readCompletedPayload?: () => Promise<ArrayBuffer | ArrayBufferView> | ArrayBuffer | ArrayBufferView;
  storage?: {
    setItem: (key: string, value: string) => void;
  } | null;
  capturedAtIso?: string;
}>): Promise<AppV2CardReadControllerResult>;
