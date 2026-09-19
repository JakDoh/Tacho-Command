import type { AppV2LiveSession } from "./app-v2-live-session.js";
import type { CoreDriverTelemetry } from "./tacho-live.js";

export type AppV2FieldTransport = Readonly<{
  deviceLabel?: string | null;
  sendUds: (payload: readonly number[], timeoutMs?: number) => Promise<readonly number[] | null>;
  close?: () => Promise<void> | void;
}>;

export type AppV2FieldSessionResult = Readonly<{
  status: "live" | "incomplete" | "error" | "invalid_transport" | "invalid_transport_factory";
  session: AppV2LiveSession;
  telemetry: CoreDriverTelemetry | null;
}>;

export declare function runAppV2FieldSession(input?: Readonly<{
  openTransport?: () => Promise<AppV2FieldTransport | null>;
  closeTransport?: () => Promise<void> | void;
  deviceLabel?: string | null;
  attemptCode?: string | null;
  telemetryAcceptedCount?: number | null;
  timeoutMs?: number;
  now?: () => Date;
}>): Promise<AppV2FieldSessionResult>;
