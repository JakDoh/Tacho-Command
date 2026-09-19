import { runAppV2FieldSession } from "./app-v2-field-session.js";
import { createTechnicalTelemetryAttemptCode } from "./technical-telemetry.js";
import { postTechnicalTelemetry } from "./technical-telemetry-client.js";

const finiteNonNegative = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;

function createAttemptIdentity(cryptoImpl) {
  if (!cryptoImpl || typeof cryptoImpl.randomUUID !== "function") {
    throw new Error("Secure session identifier generator unavailable");
  }

  return Object.freeze({
    sessionId: cryptoImpl.randomUUID(),
    attemptCode: createTechnicalTelemetryAttemptCode(cryptoImpl),
  });
}

function baseEvent(identity, event, phase, outcome, extra = {}) {
  return {
    sessionId: identity.sessionId,
    attemptCode: identity.attemptCode,
    event,
    phase,
    outcome,
    deviceFamily: "unknown",
    ...extra,
  };
}

function appendVerifiedDidEvents(events, identity, telemetry) {
  if (!telemetry || typeof telemetry !== "object") return;

  if (telemetry.activityValid === true) {
    events.push(baseEvent(identity, "did_read", "live_read", "positive", { did: "F903" }));
  }
  if (finiteNonNegative(telemetry.continuousDrivingSeconds)) {
    events.push(baseEvent(identity, "did_read", "live_read", "positive", { did: "F923" }));
  }
  if (finiteNonNegative(telemetry.cumulativeBreakSeconds)) {
    events.push(baseEvent(identity, "did_read", "live_read", "positive", { did: "F925" }));
  }
  if (finiteNonNegative(telemetry.dailyDrivingSeconds)) {
    events.push(baseEvent(identity, "did_read", "live_read", "positive", { did: "F99A" }));
  }
  if (finiteNonNegative(telemetry.weeklyDrivingSeconds)) {
    events.push(baseEvent(identity, "did_read", "live_read", "positive", { did: "F99B" }));
  }
}

export async function runAppV2LiveAttemptWithTelemetry({
  openTransport,
  cryptoImpl = globalThis.crypto,
  postTelemetry = postTechnicalTelemetry,
  now = () => new Date(),
} = {}) {
  let identity;
  try {
    identity = createAttemptIdentity(cryptoImpl);
  } catch {
    const result = await runAppV2FieldSession({ openTransport, now });
    return Object.freeze({
      ...result,
      attemptCode: null,
      telemetryStatus: "unavailable",
      telemetryAcceptedCount: null,
      telemetryEventCount: 0,
    });
  }

  const events = [
    baseEvent(identity, "connect_start", "bluetooth", "start"),
  ];

  let transportReady = false;

  const result = await runAppV2FieldSession({
    openTransport: async () => {
      if (typeof openTransport !== "function") {
        throw new Error("Field transport factory nije dostupan.");
      }

      const transport = await openTransport();
      transportReady = true;
      events.push(baseEvent(identity, "transport_ready", "transport", "positive"));
      events.push(baseEvent(identity, "tester_present", "tester_present", "positive"));
      return transport;
    },
    attemptCode: identity.attemptCode,
    now,
  });

  appendVerifiedDidEvents(events, identity, result.telemetry);

  if (result.status === "live") {
    events.push(baseEvent(identity, "snapshot_complete", "live_read", "complete"));
  } else {
    events.push(baseEvent(
      identity,
      "error",
      transportReady ? "live_read" : "bluetooth",
      "error",
      { errorCode: "unknown" },
    ));
  }

  let telemetryResult;
  try {
    telemetryResult = await postTelemetry(events);
  } catch {
    telemetryResult = Object.freeze({ status: "network_unavailable", accepted: 0 });
  }

  return Object.freeze({
    ...result,
    attemptCode: identity.attemptCode,
    telemetryStatus: telemetryResult?.status ?? "rejected",
    telemetryAcceptedCount: telemetryResult?.status === "accepted"
      ? Number(telemetryResult.accepted ?? 0)
      : null,
    telemetryEventCount: events.length,
  });
}
