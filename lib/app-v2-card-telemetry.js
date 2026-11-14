import {
  createTechnicalTelemetryAttemptCode,
} from "./technical-telemetry.js";
import { postTechnicalTelemetry } from "./technical-telemetry-client.js";

const classifyCardError = (error) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/BLE_CANCELLED|AbortError/i.test(message)) return "operation_cancelled";
  if (message === "LIVE provera se nije završila na vreme.") return "live_idle_timeout";
  if (message === "LIVE_CLOSE_TIMEOUT") return "live_close_timeout";
  if (message === "LIVE_CLOSE_FAILED") return "live_close_failed";
  if (/Brzina tahografa nije potvrđena/.test(message)) return "stationary_response_unconfirmed";
  if (/Vozilo nije na 0 km\/h/.test(message)) return "stationary_response_nonzero";
  if (/Prvo povežite tahograf|LIVE veza je završena pre očitavanja|Tahograf iz LIVE veze nije dostupan/.test(message)) return "live_unavailable";
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
  stage: progress.stage,
  lastConfirmedStage: progress.lastConfirmedStage,
  packetCount: progress.submessages,
  byteCount: progress.byteLength,
  ...extra,
});

export function createAppV2CardTelemetry({
  cryptoImpl = globalThis.crypto,
  postTelemetry = postTechnicalTelemetry,
  now = () => Date.now(),
  preparing = false,
} = {}) {
  if (!cryptoImpl || typeof cryptoImpl.randomUUID !== "function") return null;
  let identity;
  try {
    identity = Object.freeze({
      sessionId: cryptoImpl.randomUUID(),
      attemptCode: createTechnicalTelemetryAttemptCode(cryptoImpl),
    });
  } catch { return null; } // Diagnostics must never prevent a card read.
  const startedAt = Number(now());
  const events = [];
  let progress = Object.freeze({ submessages: 0, byteLength: 0,
    stage: preparing ? "preparation_requested" : null, lastConfirmedStage: null });
  let diagnosticErrorCode = null;
  let diagnosticNrc = null;
  let lastCheckpoint = 0;
  const checkpoint = (entry) => { try { void Promise.resolve(postTelemetry([entry])).catch(() => {}); } catch {} };
  let transportFailed = false;
  let transportStarted = !preparing;
  let finished = false;
  let finishPromise = null;

  events.push(event(identity, preparing ? "card_preparation_start" : "card_read_start",
    preparing ? "card_preparation" : "card_transport", "start", progress));
  checkpoint(events[0]);

  return Object.freeze({
    attemptCode: identity.attemptCode,
    preparationStage(stage) {
      if (transportStarted || transportFailed || finished) return;
      progress = Object.freeze({ ...progress, stage,
        lastConfirmedStage: stage === "stationary_confirmed" ? stage : progress.lastConfirmedStage });
      const entry = event(identity, "card_preparation_progress", "card_preparation", "positive", progress);
      events.push(entry); checkpoint(entry);
    },
    preparationError(error, { cancelled = false } = {}) {
      if (transportFailed || finished) return;
      transportFailed = true;
      const errorCode = cancelled ? "operation_cancelled" : classifyCardError(error);
      events.push(event(identity, "card_preparation_error", "card_preparation",
        errorCode === "operation_cancelled" ? "cancelled" : "error", progress, {
          durationMs: Math.max(0, Math.floor(Number(now()) - startedAt)),
          errorCode,
        }));
    },
    transportStart() {
      if (transportStarted || transportFailed || finished) return;
      transportStarted = true;
      progress = Object.freeze({ ...progress, stage: "card_ready", lastConfirmedStage: "card_ready" });
      const entry = event(identity, "card_read_start", "card_transport", "start", progress);
      events.push(entry); checkpoint(entry);
    },
    progress(value = {}) {
      progress = Object.freeze({
        submessages: Number.isInteger(value.submessages) && value.submessages >= 0
          ? value.submessages : progress.submessages,
        byteLength: Number.isInteger(value.byteLength) && value.byteLength >= 0
          ? value.byteLength : progress.byteLength,
        stage: progress.stage,
        lastConfirmedStage: progress.lastConfirmedStage,
      });
      if (progress.submessages >= lastCheckpoint + 10) {
        lastCheckpoint = progress.submessages;
        checkpoint(event(identity, "card_transfer_progress", "card_transfer", "positive", progress));
      }
    },
    diagnostic(value = {}) {
      progress = Object.freeze({
        ...progress,
        stage: value.stage ?? progress.stage,
        lastConfirmedStage: value.lastConfirmedStage ?? progress.lastConfirmedStage,
      });
      if (value.errorCode) {
        const nrc = /^NRC 0x([0-9A-F]{2})$/i.exec(value.errorCode);
        diagnosticNrc = nrc ? Number.parseInt(nrc[1], 16) : null;
        diagnosticErrorCode = nrc ? "negative_response" : value.errorCode;
      }
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
        errorCode: diagnosticErrorCode ?? classifyCardError(error),
        nrc: diagnosticNrc,
      }));
    },
    finish(result) {
      if (finished) return finishPromise;
      finished = true;
      if (!transportFailed) {
        const accepted = ["accepted", "accepted_unsaved"].includes(result?.status);
        events.push(event(
          identity,
          accepted ? "card_pipeline_complete" : "card_pipeline_error",
          "card_pipeline",
          accepted ? "complete" : "error",
          progress,
          accepted && result?.status === "accepted" ? {} : {
            errorCode: ["storage_error", "accepted_unsaved"].includes(result?.status)
              ? "storage_error"
              : result?.status?.startsWith?.("parser_") || result?.status?.includes?.("invalid")
                ? "parser_rejected"
                : "unknown",
          },
        ));
      }
      finishPromise = Promise.resolve().then(() => postTelemetry(events))
        .catch(() => Object.freeze({ status: "network_unavailable", accepted: 0 }));
      return finishPromise;
    },
  });
}
