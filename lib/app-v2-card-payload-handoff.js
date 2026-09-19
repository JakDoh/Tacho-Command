import { processAppV2ParsedCard } from "./app-v2-card-pipeline.js";

function byteArray(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

export async function handoffCompletedCardPayload({
  payload,
  parseCard,
  storage,
  capturedAtIso = new Date().toISOString(),
} = {}) {
  const bytes = byteArray(payload);
  if (!bytes || bytes.byteLength === 0 || typeof parseCard !== "function") {
    return Object.freeze({
      status: "rejected_payload",
      card: null,
      snapshot: null,
    });
  }

  let parserResult;
  try {
    parserResult = await parseCard(bytes);
  } catch {
    return Object.freeze({
      status: "parser_error",
      card: null,
      snapshot: null,
    });
  }

  return processAppV2ParsedCard({
    storage,
    parserResult,
    capturedAtIso,
  });
}
