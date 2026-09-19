export const APP_V2_CARD_PHASES = Object.freeze([
  "idle",
  "reading",
  "accepted",
  "error",
]);

function phase(value) {
  return APP_V2_CARD_PHASES.includes(value) ? value : "idle";
}

function cleanString(value, maxLength = 240) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function createAppV2CardSession(input = {}) {
  const currentPhase = phase(input.phase);
  const currentCard = input.currentCard && typeof input.currentCard === "object"
    ? input.currentCard
    : null;

  return Object.freeze({
    phase: currentPhase,
    busy: currentPhase === "reading",
    canStart: currentPhase !== "reading",
    statusLabel: {
      idle: "Kartica spremna za očitavanje",
      reading: "Čitam kompletnu karticu…",
      accepted: "Novo očitavanje kartice potvrđeno",
      error: "Novo očitavanje nije prihvaćeno",
    }[currentPhase],
    errorText: currentPhase === "error" ? cleanString(input.errorText) : null,
    currentCard,
    capturedAtIso: cleanString(input.capturedAtIso, 48),
  });
}

export function beginAppV2CardRead(session = {}) {
  const current = createAppV2CardSession(session);
  if (current.busy) return current;
  return createAppV2CardSession({
    ...current,
    phase: "reading",
    errorText: null,
  });
}

export function acceptAppV2CardRead(session = {}, result = {}) {
  const current = createAppV2CardSession(session);
  if (current.phase !== "reading" || result.status !== "accepted" || !result.card) {
    return null;
  }

  return createAppV2CardSession({
    phase: "accepted",
    currentCard: result.card,
    capturedAtIso: result.card.lastCardReadAtIso ?? result.snapshot?.capturedAtIso ?? null,
  });
}

export function failAppV2CardRead(session = {}, errorText = null) {
  const current = createAppV2CardSession(session);
  if (current.phase !== "reading") return null;

  return createAppV2CardSession({
    phase: "error",
    currentCard: current.currentCard,
    capturedAtIso: current.capturedAtIso,
    errorText: cleanString(errorText) ?? "Novo očitavanje nije potvrđeno. Poslednje dobro stanje je sačuvano.",
  });
}
