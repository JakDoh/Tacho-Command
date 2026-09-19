import type { AppV2LiveSession } from "./app-v2-live-session.js";
import type { CoreDriverTelemetry } from "./tacho-live.js";

export type AppV2FieldLiveReadResult = Readonly<{
  status: "live" | "incomplete" | "error" | "invalid_transport";
  session: AppV2LiveSession;
  telemetry: CoreDriverTelemetry | null;
}>;

export declare function runAppV2FieldLiveRead(input?: Readonly<{
  sendUds?: (payload: readonly number[], timeoutMs?: number) => Promise<readonly number[] | null>;
  deviceLabel?: string | null;
  attemptCode?: string | null;
  telemetryAcceptedCount?: number | null;
  timeoutMs?: number;
  now?: () => Date;
}>): Promise<AppV2FieldLiveReadResult>;
