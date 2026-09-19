import type {
  AppV2FieldSessionResult,
  AppV2FieldTransport,
} from "./app-v2-field-session.js";

export type AppV2LiveAttemptWithTelemetryResult = AppV2FieldSessionResult & Readonly<{
  attemptCode: string | null;
  telemetryStatus: string;
  telemetryAcceptedCount: number | null;
  telemetryEventCount: number;
}>;

export declare function runAppV2LiveAttemptWithTelemetry(input?: Readonly<{
  openTransport?: () => Promise<AppV2FieldTransport | null>;
  cryptoImpl?: {
    randomUUID: () => string;
    getRandomValues: (array: Uint8Array) => Uint8Array;
  };
  postTelemetry?: (events: readonly Readonly<Record<string, unknown>>[]) => Promise<Readonly<{
    status: string;
    accepted: number;
  }>>;
  now?: () => Date;
}>): Promise<AppV2LiveAttemptWithTelemetryResult>;
