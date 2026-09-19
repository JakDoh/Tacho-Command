import { readCoreDriverTelemetry } from "./tacho-live.js";
import {
  appV2LiveSessionFromTelemetry,
  createAppV2LiveSession,
  transitionAppV2LiveSession,
} from "./app-v2-live-session.js";

function cleanString(value, maxLength = 120) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function runAppV2FieldLiveRead({
  sendUds,
  deviceLabel = null,
  attemptCode = null,
  telemetryAcceptedCount = null,
  timeoutMs = 4000,
  now = () => new Date(),
} = {}) {
  if (typeof sendUds !== "function") {
    return Object.freeze({
      status: "invalid_transport",
      session: createAppV2LiveSession({
        phase: "error",
        errorText: "LIVE transport adapter nije dostupan.",
      }),
      telemetry: null,
    });
  }

  let session = createAppV2LiveSession();
  session = transitionAppV2LiveSession(session, "connecting", { deviceLabel }) ?? session;
  session = transitionAppV2LiveSession(session, "transport-ready", { deviceLabel }) ?? session;
  session = transitionAppV2LiveSession(session, "reading", { deviceLabel }) ?? session;

  try {
    const telemetry = await readCoreDriverTelemetry(sendUds, timeoutMs);
    const timestamp = now();
    const lastLiveReadLabel = timestamp instanceof Date && Number.isFinite(timestamp.getTime())
      ? timestamp.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })
      : null;

    const verified = appV2LiveSessionFromTelemetry({
      telemetry,
      deviceLabel: cleanString(deviceLabel, 96),
      attemptCode,
      telemetryAcceptedCount,
      lastLiveReadLabel,
    });

    return Object.freeze({
      status: verified.phase === "live" ? "live" : "incomplete",
      session: verified,
      telemetry,
    });
  } catch (error) {
    return Object.freeze({
      status: "error",
      session: createAppV2LiveSession({
        phase: "error",
        deviceLabel: cleanString(deviceLabel, 96),
        attemptCode,
        telemetryAcceptedCount,
        errorText: error instanceof Error ? error.message : String(error),
      }),
      telemetry: null,
    });
  }
}
