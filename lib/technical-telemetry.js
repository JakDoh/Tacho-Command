export const TECHNICAL_TELEMETRY_SCHEMA = "tc-tech-v1";
export const TECHNICAL_TELEMETRY_RETENTION_DAYS = 60;
export const TECHNICAL_TELEMETRY_MAX_BATCH = 20;

export const TECHNICAL_TELEMETRY_EVENTS = Object.freeze([
  "connect_start",
  "gatt_connected",
  "transport_ready",
  "tester_present",
  "did_read",
  "snapshot_complete",
  "timeout",
  "nrc",
  "disconnected",
  "error",
]);

export const TECHNICAL_TELEMETRY_PHASES = Object.freeze([
  "bluetooth",
  "gatt",
  "transport",
  "tester_present",
  "live_read",
  "teardown",
]);

export const TECHNICAL_TELEMETRY_OUTCOMES = Object.freeze([
  "start",
  "positive",
  "complete",
  "timeout",
  "nrc",
  "disconnected",
  "cancelled",
  "error",
]);

export const TECHNICAL_TELEMETRY_DIDS = Object.freeze([
  "F903",
  "F923",
  "F925",
  "F99A",
  "F99B",
]);

export const TECHNICAL_TELEMETRY_DEVICE_FAMILIES = Object.freeze([
  "vdo-dtco-4x",
  "stoneridge-se5000-smart2",
  "smart-tacho-2-other",
  "unknown",
]);

export const TECHNICAL_TELEMETRY_ERROR_CODES = Object.freeze([
  "bluetooth_unavailable",
  "chooser_cancelled",
  "gatt_connect_failed",
  "service_missing",
  "characteristic_missing",
  "credits_timeout",
  "tester_present_timeout",
  "read_timeout",
  "negative_response",
  "unexpected_response",
  "disconnected",
  "unknown",
]);

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_DURATION_MS = 5 * 60 * 1000;

function enumValue(value, allowed, fallback = null) {
  if (typeof value !== "string") return fallback;
  return allowed.includes(value) ? value : fallback;
}

function optionalBoundedInteger(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export function normalizeTechnicalTelemetrySessionId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return SESSION_ID_PATTERN.test(normalized) ? normalized : null;
}

export function sanitizeTechnicalTelemetryEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const sessionId = normalizeTechnicalTelemetrySessionId(input.sessionId);
  const event = enumValue(input.event, TECHNICAL_TELEMETRY_EVENTS);
  const phase = enumValue(input.phase, TECHNICAL_TELEMETRY_PHASES);
  const outcome = enumValue(input.outcome, TECHNICAL_TELEMETRY_OUTCOMES);

  if (!sessionId || !event || !phase || !outcome) return null;

  const did = input.did === null || input.did === undefined
    ? null
    : enumValue(input.did, TECHNICAL_TELEMETRY_DIDS);
  if (input.did !== null && input.did !== undefined && !did) return null;

  return Object.freeze({
    schema: TECHNICAL_TELEMETRY_SCHEMA,
    sessionId,
    event,
    phase,
    outcome,
    did,
    durationMs: optionalBoundedInteger(input.durationMs, 0, MAX_DURATION_MS),
    nrc: optionalBoundedInteger(input.nrc, 0, 0xff),
    deviceFamily: enumValue(
      input.deviceFamily,
      TECHNICAL_TELEMETRY_DEVICE_FAMILIES,
      "unknown",
    ),
    errorCode: input.errorCode === null || input.errorCode === undefined
      ? null
      : enumValue(input.errorCode, TECHNICAL_TELEMETRY_ERROR_CODES, "unknown"),
  });
}

export function sanitizeTechnicalTelemetryBatch(input, maxBatch = TECHNICAL_TELEMETRY_MAX_BATCH) {
  if (!Array.isArray(input)) return Object.freeze([]);
  const bounded = input.slice(0, Math.max(0, Math.min(TECHNICAL_TELEMETRY_MAX_BATCH, maxBatch)));
  return Object.freeze(
    bounded
      .map((event) => sanitizeTechnicalTelemetryEvent(event))
      .filter(Boolean),
  );
}

export function technicalTelemetryRetentionCutoffEpochSeconds(nowMs = Date.now()) {
  const nowSeconds = Math.floor(Number(nowMs) / 1000);
  return nowSeconds - TECHNICAL_TELEMETRY_RETENTION_DAYS * 24 * 60 * 60;
}
