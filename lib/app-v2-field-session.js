import { runAppV2FieldLiveRead } from "./app-v2-field-live-adapter.js";
import {
  createAppV2LiveSession,
  transitionAppV2LiveSession,
} from "./app-v2-live-session.js";

function cleanString(value, maxLength = 120) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function runAppV2FieldSession({
  openTransport,
  closeTransport,
  deviceLabel = null,
  attemptCode = null,
  telemetryAcceptedCount = null,
  timeoutMs = 4000,
  now = () => new Date(),
  keepTransportOpen = false,
} = {}) {
  let session = createAppV2LiveSession();

  if (typeof openTransport !== "function") {
    return Object.freeze({
      status: "invalid_transport_factory",
      session: createAppV2LiveSession({
        phase: "error",
        errorText: "Field transport factory nije dostupan.",
      }),
      telemetry: null,
    });
  }

  session = transitionAppV2LiveSession(session, "connecting", {
    deviceLabel: cleanString(deviceLabel, 96),
    attemptCode,
    telemetryAcceptedCount,
  }) ?? session;

  let transport = null;

  try {
    transport = await openTransport();
    if (!transport || typeof transport.sendUds !== "function") {
      throw new Error("Field transport nije vratio sendUds.");
    }

    const effectiveDeviceLabel = cleanString(
      transport.deviceLabel ?? deviceLabel,
      96,
    );

    session = transitionAppV2LiveSession(session, "transport-ready", {
      deviceLabel: effectiveDeviceLabel,
      attemptCode,
      telemetryAcceptedCount,
    }) ?? session;

    const live = await runAppV2FieldLiveRead({
      sendUds: transport.sendUds,
      deviceLabel: effectiveDeviceLabel,
      attemptCode,
      telemetryAcceptedCount,
      timeoutMs,
      now,
    });

    const retainTransport = keepTransportOpen
      && ["live", "incomplete"].includes(live.status)
      && transport?.isConnected?.() !== false;
    const result = Object.freeze({
      status: live.status,
      session: live.session,
      telemetry: live.telemetry,
      transport: retainTransport ? transport : null,
    });
    if (result.transport) transport = null;
    return result;
  } catch (error) {
    return Object.freeze({
      status: "error",
      session: createAppV2LiveSession({
        phase: "error",
        deviceLabel: cleanString(transport?.deviceLabel ?? deviceLabel, 96),
        attemptCode,
        telemetryAcceptedCount,
        errorText: error instanceof Error ? error.message : String(error),
      }),
      telemetry: null,
    });
  } finally {
    const closer = typeof transport?.close === "function"
      ? transport.close
      : typeof closeTransport === "function"
        ? closeTransport
        : null;

    if (closer) {
      try {
        await closer();
      } catch {
        // Teardown failure must not overwrite a verified LIVE/error result.
      }
    }
  }
}
