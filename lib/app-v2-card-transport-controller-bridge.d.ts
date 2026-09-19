import type { AppV2CardReadControllerResult } from "./app-v2-card-read-controller.js";

export declare function runBrowserAppV2GoldenCardRead(input?: Readonly<{
  session?: Readonly<Record<string, unknown>>;
  storage?: {
    setItem: (key: string, value: string) => void;
  } | null;
  capturedAtIso?: string;
  transportOptions?: Readonly<{
    requestTimeoutMs?: number;
    cardIdleTimeoutMs?: number;
    p3GuardMs?: number;
  }>;
}>): Promise<AppV2CardReadControllerResult>;
