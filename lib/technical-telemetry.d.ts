export type TechnicalTelemetryEventName =
  | "connect_start"
  | "gatt_connected"
  | "transport_ready"
  | "tester_present"
  | "did_read"
  | "snapshot_complete"
  | "timeout"
  | "nrc"
  | "disconnected"
  | "error";

export type TechnicalTelemetryPhase =
  | "bluetooth"
  | "gatt"
  | "transport"
  | "tester_present"
  | "live_read"
  | "teardown";

export type TechnicalTelemetryOutcome =
  | "start"
  | "positive"
  | "complete"
  | "timeout"
  | "nrc"
  | "disconnected"
  | "cancelled"
  | "error";

export type TechnicalTelemetryDid = "F903" | "F923" | "F925" | "F99A" | "F99B";
export type TechnicalTelemetryDeviceFamily =
  | "vdo-dtco-4x"
  | "stoneridge-se5000-smart2"
  | "smart-tacho-2-other"
  | "unknown";

export type TechnicalTelemetrySanitizedEvent = Readonly<{
  schema: "tc-tech-v1";
  sessionId: string;
  event: TechnicalTelemetryEventName;
  phase: TechnicalTelemetryPhase;
  outcome: TechnicalTelemetryOutcome;
  did: TechnicalTelemetryDid | null;
  durationMs: number | null;
  nrc: number | null;
  deviceFamily: TechnicalTelemetryDeviceFamily;
  errorCode: string | null;
  packetCount: number | null;
  byteCount: number | null;
}>;

export const TECHNICAL_TELEMETRY_SCHEMA: "tc-tech-v1";
export const TECHNICAL_TELEMETRY_RETENTION_DAYS: 60;
export const TECHNICAL_TELEMETRY_MAX_BATCH: 20;
export const TECHNICAL_TELEMETRY_EVENTS: readonly TechnicalTelemetryEventName[];
export const TECHNICAL_TELEMETRY_PHASES: readonly TechnicalTelemetryPhase[];
export const TECHNICAL_TELEMETRY_OUTCOMES: readonly TechnicalTelemetryOutcome[];
export const TECHNICAL_TELEMETRY_DIDS: readonly TechnicalTelemetryDid[];
export const TECHNICAL_TELEMETRY_DEVICE_FAMILIES: readonly TechnicalTelemetryDeviceFamily[];

export function normalizeTechnicalTelemetrySessionId(value: unknown): string | null;
export function sanitizeTechnicalTelemetryEvent(input: unknown): TechnicalTelemetrySanitizedEvent | null;
export function sanitizeTechnicalTelemetryBatch(input: unknown, maxBatch?: number): readonly TechnicalTelemetrySanitizedEvent[];
export function technicalTelemetryRetentionCutoffEpochSeconds(nowMs?: number): number;
