import { acceptAppV2CardResult } from "./app-v2-card-result-boundary.js";
import { normalizeParserCardResult } from "./app-v2-parser-card-adapter.js";

export function processAppV2ParsedCard({
  storage,
  parserResult,
  capturedAtIso = new Date().toISOString(),
} = {}) {
  const normalized = normalizeParserCardResult(parserResult);
  if (!normalized) {
    return Object.freeze({
      status: "rejected_parser_result",
      card: null,
      snapshot: null,
    });
  }

  const accepted = acceptAppV2CardResult({
    storage,
    cardState: normalized,
    capturedAtIso,
    source: "parser-normalized",
  });

  return Object.freeze({
    status: accepted.status,
    card: accepted.card,
    snapshot: accepted.snapshot,
  });
}
