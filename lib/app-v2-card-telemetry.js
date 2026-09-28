import {
  createTechnicalTelemetryAttemptCode,
} from "./technical-telemetry.js";
import { postTechnicalTelemetry } from "./technical-telemetry-client.js";

const classifyCardError = (error) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/Bluetooth nije dostupan/i.test(message)) return "bluetooth_unavailable";
  if (/GATT/i.test(message)) return "gatt_connect_failed";
  if (/servis nije pronađen/i.test(message)) return "service_missing";
  if (/karakteristike nisu pronađene/i.test(message)) return "characteristic_missing";
  if (/credit timeout/i.test(message)) return "credits_timeout";
  if (/zatvorio.*flow-control|VU je zatvorio/i.test(message)) return "peer_closed";
  if (/redosled|sequence|counter/i.test(message)) return "packet_sequence_error";
  if (/TIMEOUT/i.test(message)) return "read_timeout";
  if (/NRC/i.test(message)) return "negative_response";
  if (/TLV|payload/i.test(message)) return "payload_invalid";
  if (/prekinut|disconnect|zatvoren/i.test(message)) return "disconnected";
  return "unknown";
};

const event = (identity, name, phase, outcome, progress, extra = {}) => ({
  sessionId: identity.sessionId,
  attemptCode: identity.attemptCode,
  event: name,
  phase,
  outcome,
  deviceFamily: "unknown",
  packetCount: progress.submessages,
  byteCount: progress.byteLength,
  ...extra,
});

export function createAppV2CardTelemetry({
  cryptoImpl = globalThis.crypto,
  postTelemetry = postTechnicalTelemetry,
  now = () => Date.now(),
} = {}) {
  if (!cryptoImpl || typeof cryptoImpl.randomUUID !== "function") return null;
  const identity = Object.freeze({
    sessionId: cryptoImpl.randomUUID(),
    attemptCode: createTechnicalTelemetryAttemptCode(cryptoImpl),
  });
  const startedAt = Number(now());
  const events = [];
  let progress = Object.freeze({ submessages: 0, byteLength: 0 });
  let transportFailed = false;

  events.push(event(identity, "card_read_start", "card_transport", "start", progress));

  return Object.freeze({
    attemptCode: identity.attemptCode,
    progress(value = {}) {
      progress = Object.freeze({
        submessages: Number.isInteger(value.submessages) && value.submessages >= 0
          ? value.submessages : progress.submessages,
        byteLength: Number.isInteger(value.byteLength) && value.byteLength >= 0
          ? value.byteLength : progress.byteLength,
      });
    },
    transportComplete() {
      events.push(event(identity, "card_transfer_complete", "card_transfer", "complete", progress, {
        durationMs: Math.max(0, Math.floor(Number(now()) - startedAt)),
      }));
    },
    transportError(error) {
      transportFailed = true;
      events.push(event(identity, "card_transfer_error", "card_transfer", "error", progress, {
        durationMs: Math.max(0, Math.floor(Number(now()) - startedAt)),
        errorCode: classifyCardError(error),
      }));
    },
    async finish(result) {
      if (!transportFailed) {
        const accepted = result?.status === "accepted";
        events.push(event(
          identity,
          accepted ? "card_pipeline_complete" : "card_pipeline_error",
          "card_pipeline",
          accepted ? "complete" : "error",
          progress,
          accepted ? {} : {
            errorCode: result?.status === "storage_error"
              ? "storage_error"
              : result?.status?.startsWith?.("parser_") || result?.status?.includes?.("invalid")
                ? "parser_rejected"
                : "unknown",
          },
        ));
      }
      try {
        return await postTelemetry(events);
      } catch {
        return Object.freeze({ status: "network_unavailable", accepted: 0 });
      }
    },
  });
}
