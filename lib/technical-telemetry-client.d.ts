import type { TechnicalTelemetryEvent } from "./technical-telemetry.js";

export type TechnicalTelemetryPostResult = Readonly<{
  status: "accepted" | "storage_unavailable" | "network_unavailable" | "no_valid_events" | "rejected";
  accepted: number;
}>;

export function postTechnicalTelemetry(
  events: readonly Partial<TechnicalTelemetryEvent>[],
  options?: {
    endpoint?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  },
): Promise<TechnicalTelemetryPostResult>;
