import {
  acceptAppV2CardRead,
  beginAppV2CardRead,
  failAppV2CardRead,
} from "./app-v2-card-session.js";
import { handoffCanonicalAppV2CardPayload } from "./app-v2-card-payload-handoff.js";

export async function runAppV2CardRead({
  session,
  readCompletedPayload,
  storage,
  capturedAtIso = new Date().toISOString(),
} = {}) {
  const readingSession = beginAppV2CardRead(session);

  if (typeof readCompletedPayload !== "function") {
    return Object.freeze({
      status: "read_unavailable",
      session: failAppV2CardRead(readingSession, "Čitanje kartice nije dostupno."),
      pipelineResult: null,
    });
  }

  let payload;
  try {
    payload = await readCompletedPayload();
  } catch {
    return Object.freeze({
      status: "read_error",
      session: failAppV2CardRead(
        readingSession,
        "Novo očitavanje kartice nije završeno. Poslednje dobro stanje je sačuvano.",
      ),
      pipelineResult: null,
    });
  }

  const pipelineResult = await handoffCanonicalAppV2CardPayload({
    payload,
    storage,
    capturedAtIso,
  });

  if (pipelineResult.status !== "accepted") {
    return Object.freeze({
      status: pipelineResult.status,
      session: failAppV2CardRead(
        readingSession,
        "Novo očitavanje kartice nije potvrđeno. Poslednje dobro stanje je sačuvano.",
      ),
      pipelineResult,
    });
  }

  const acceptedSession = acceptAppV2CardRead(readingSession, pipelineResult);
  if (!acceptedSession) {
    return Object.freeze({
      status: "session_rejected",
      session: failAppV2CardRead(
        readingSession,
        "Novo očitavanje nije moglo bezbedno da zameni postojeće stanje.",
      ),
      pipelineResult,
    });
  }

  return Object.freeze({
    status: "accepted",
    session: acceptedSession,
    pipelineResult,
  });
}
