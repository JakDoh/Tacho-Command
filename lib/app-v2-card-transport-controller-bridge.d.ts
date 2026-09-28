import type { AppV2CardReadControllerResult } from "./app-v2-card-read-controller.js";

export declare function runBrowserAppV2GoldenCardRead(input?: Readonly<{
  session?: Readonly<Record<string, unknown>>;
  storage?: {
    setItem: (key: string, value: string) => void;
  } | null;
  capturedAtIso?: string;
  onProgress?: (progress: Readonly<{ submessages: number; byteLength: number; complete: boolean }>) => void;
  onTelemetryAttempt?: (attemptCode: string) => void;
  transportOptions?: Readonly<{
    requestTimeoutMs?: number;
    cardIdleTimeoutMs?: number;
    p3GuardMs?: number;
  }>;
}>): Promise<AppV2CardReadControllerResult & Readonly<{
  cardAttemptCode: string | null;
  cardTelemetryStatus: string;
  cardTelemetryAcceptedCount: number | null;
  transportCompleted: boolean;
}>>;
