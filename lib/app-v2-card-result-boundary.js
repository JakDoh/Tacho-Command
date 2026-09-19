import {
  cardStateFromLastGoodCardSnapshot,
  createLastGoodCardSnapshot,
  saveLastGoodCardSnapshot,
} from "./last-good-card-snapshot.js";

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value, maxLength = 160) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function acceptAppV2CardResult({
  storage,
  cardState,
  capturedAtIso = new Date().toISOString(),
  source = "parser-normalized",
} = {}) {
  if (!plainObject(cardState)) {
    return Object.freeze({
      status: "rejected_invalid",
      card: null,
      snapshot: null,
      source: cleanString(source, 64),
    });
  }

  const snapshot = createLastGoodCardSnapshot(cardState, capturedAtIso);
  if (!snapshot) {
    return Object.freeze({
      status: "rejected_incomplete",
      card: null,
      snapshot: null,
      source: cleanString(source, 64),
    });
  }

  const saveResult = saveLastGoodCardSnapshot(storage, cardState, capturedAtIso);
  if (saveResult.status !== "saved" || !saveResult.snapshot) {
    return Object.freeze({
      status: saveResult.status,
      card: null,
      snapshot: null,
      source: cleanString(source, 64),
    });
  }

  const card = cardStateFromLastGoodCardSnapshot(saveResult.snapshot);
  if (!card) {
    return Object.freeze({
      status: "rejected_invalid",
      card: null,
      snapshot: null,
      source: cleanString(source, 64),
    });
  }

  return Object.freeze({
    status: "accepted",
    card,
    snapshot: saveResult.snapshot,
    source: cleanString(source, 64) ?? "parser-normalized",
  });
}
