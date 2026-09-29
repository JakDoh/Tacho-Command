import type { CardTransportDiagnostic } from "./card-transport-diagnostic";
import type { AppV2CardReadControllerResult } from "./app-v2-card-read-controller.js";

export declare function runBrowserAppV2GoldenCardRead(input?: Readonly<{
  session?: Readonly<Record<string, unknown>>;
  storage?: {
    setItem: (key: string, value: string) => void;
  } | null;
  capturedAtIso?: string;
  onDiagnostic?: (value: CardTransportDiagnostic) => void;
  onProgress?: (progress: Readonly<{ submessages: number; byteLength: number; complete: boolean }>) => void;
  onTelemetryAttempt?: (attemptCode: string) => void;
  transportOptions?: Readonly<{
    device?: unknown;
    disconnectOnFinish?: boolean;
    signal?: AbortSignal;
    requestTimeoutMs?: number;
    firstPacketTimeoutMs?: number;
    cardIdleTimeoutMs?: number;
    p3GuardMs?: number;
    writeTimeoutMs?: number;
  }>;
}>): Promise<AppV2CardReadControllerResult & Readonly<{
  cardAttemptCode: string | null;
  cardTelemetryStatus: string;
  cardTelemetryAcceptedCount: number | null;
  transportCompleted: boolean;
}>>;
