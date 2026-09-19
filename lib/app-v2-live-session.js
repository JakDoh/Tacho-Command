import { createFieldProvenLiveSnapshot } from "./field-proven-product-state.js";

export const APP_V2_LIVE_PHASES = Object.freeze([
  "idle",
  "connecting",
  "transport-ready",
  "reading",
  "live",
  "error",
  "disconnected",
]);

const TRANSITIONS = Object.freeze({
  idle: Object.freeze(["connecting"]),
  connecting: Object.freeze(["transport-ready", "error", "disconnected"]),
  "transport-ready": Object.freeze(["reading", "error", "disconnected"]),
  reading: Object.freeze(["live", "error", "disconnected"]),
  live: Object.freeze(["reading", "error", "disconnected"]),
  error: Object.freeze(["connecting", "disconnected"]),
  disconnected: Object.freeze(["connecting"]),
});

function cleanString(value, maxLength = 120) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function finiteNonNegative(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function boundedInteger(value, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function phase(value) {
  return APP_V2_LIVE_PHASES.includes(value) ? value : "idle";
}

export function createAppV2LiveSession(input = {}) {
  const currentPhase = phase(input.phase);
  const connected = ["transport-ready", "reading", "live"].includes(currentPhase);
  const telemetry = input.telemetry && typeof input.telemetry === "object" ? input.telemetry : {};

  const productLive = createFieldProvenLiveSnapshot({
    connected,
    deviceLabel: cleanString(input.deviceLabel, 96),
    lastLiveReadLabel: cleanString(input.lastLiveReadLabel, 48),
    activity: telemetry.activity,
    continuousDrivingSec: finiteNonNegative(telemetry.continuousDrivingSeconds),
    dailyDrivingSec: finiteNonNegative(telemetry.dailyDrivingSeconds),
    weeklyDrivingSec: finiteNonNegative(telemetry.weeklyDrivingSeconds),
    telemetryAcceptedCount: boundedInteger(input.telemetryAcceptedCount, 0, 1000000),
    attemptCode: input.attemptCode,
  });

  return Object.freeze({
    phase: currentPhase,
    connected,
    busy: currentPhase === "connecting" || currentPhase === "reading",
    canConnect: ["idle", "error", "disconnected"].includes(currentPhase),
    canDisconnect: connected || currentPhase === "connecting",
    statusLabel: {
      idle: "Spreman za povezivanje",
      connecting: "Povezujem tahograf…",
      "transport-ready": "Veza potvrđena",
      reading: "Očitavam LIVE podatke…",
      live: "LIVE očitavanje potvrđeno",
      error: "Veza zahteva pažnju",
      disconnected: "Veza je prekinuta",
    }[currentPhase],
    errorText: currentPhase === "error" ? cleanString(input.errorText, 240) : null,
    productLive,
  });
}

export function transitionAppV2LiveSession(session, nextPhase, patch = {}) {
  const current = createAppV2LiveSession(session);
  const target = phase(nextPhase);
  if (target === current.phase) {
    return createAppV2LiveSession({ ...session, ...patch, phase: target });
  }

  const allowed = TRANSITIONS[current.phase] ?? [];
  if (!allowed.includes(target)) return null;

  return createAppV2LiveSession({
    ...session,
    ...patch,
    phase: target,
  });
}

export function appV2LiveSessionFromTelemetry(input = {}) {
  const telemetry = input.telemetry && typeof input.telemetry === "object" ? input.telemetry : {};
  const validCore = telemetry.activityValid === true
    && finiteNonNegative(telemetry.continuousDrivingSeconds) !== null
    && finiteNonNegative(telemetry.cumulativeBreakSeconds) !== null;

  return createAppV2LiveSession({
    phase: validCore ? "live" : "error",
    deviceLabel: input.deviceLabel,
    lastLiveReadLabel: input.lastLiveReadLabel,
    telemetry,
    telemetryAcceptedCount: input.telemetryAcceptedCount,
    attemptCode: input.attemptCode,
    errorText: validCore ? null : "Obavezni LIVE podaci nisu potvrđeni.",
  });
}
