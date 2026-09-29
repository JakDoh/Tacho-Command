import { sanitizeTechnicalTelemetryBatch } from "./technical-telemetry.js";

const DEFAULT_ENDPOINT = "/api/technical-telemetry";
const DEFAULT_TIMEOUT_MS = 3000;
const QUEUE_KEY = "tachocommand.technical-telemetry-pending.v1";
const MAX_PENDING = 100;
const RETENTION_MS = 60 * 24 * 60 * 60 * 1000;
let nextId = 0;
let flushing = false;

function browserStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
function readQueue(storage) {
  if (!storage) return [];
  try {
    const input = JSON.parse(storage.getItem(QUEUE_KEY) ?? "[]");
    if (!Array.isArray(input)) return [];
    const now = Date.now();
    return input.filter((item) => item && typeof item.id === "string"
      && Number.isFinite(item.savedAt) && now - item.savedAt >= 0
      && now - item.savedAt < RETENTION_MS
      && sanitizeTechnicalTelemetryBatch([item.event]).length === 1).slice(-MAX_PENDING);
  } catch { return []; }
}
function writeQueue(storage, records) {
  try { storage?.setItem(QUEUE_KEY, JSON.stringify(records.slice(-MAX_PENDING))); } catch {}
}
function enqueue(storage, events) {
  if (!storage) return [];
  const records = events.map((event) => ({
    id: Date.now().toString(36) + "-" + (++nextId).toString(36),
    savedAt: Date.now(),
    event,
  }));
  writeQueue(storage, [...readQueue(storage), ...records]);
  return records.map((record) => record.id);
}
function removeQueued(storage, ids) {
  if (!storage || ids.length === 0) return;
  const set = new Set(ids);
  writeQueue(storage, readQueue(storage).filter((item) => !set.has(item.id)));
}

export async function postTechnicalTelemetry(
  events,
  {
    endpoint = DEFAULT_ENDPOINT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    storage = browserStorage(),
  } = {},
) {
  const safeEvents = sanitizeTechnicalTelemetryBatch(events);
  if (safeEvents.length === 0) {
    return Object.freeze({ status: "no_valid_events", accepted: 0 });
  }

  const queuedIds = enqueue(storage, safeEvents);
  if (typeof fetchImpl !== "function") {
    return Object.freeze({ status: "network_unavailable", accepted: 0 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: safeEvents }),
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (response.status === 202 && payload?.status === "accepted") {
      removeQueued(storage, queuedIds);
      const accepted = Number.isInteger(payload.accepted) ? payload.accepted : safeEvents.length;
      return Object.freeze({ status: "accepted", accepted });
    }
    if (response.status === 503 && payload?.status === "storage_unavailable") {
      return Object.freeze({ status: "storage_unavailable", accepted: 0 });
    }
    return Object.freeze({ status: "rejected", accepted: 0 });
  } catch {
    return Object.freeze({ status: "network_unavailable", accepted: 0 });
  } finally {
    clearTimeout(timer);
  }
}

export async function flushQueuedTechnicalTelemetry({
  storage = browserStorage(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (flushing || !storage || typeof fetchImpl !== "function") return 0;
  flushing = true;
  let accepted = 0;
  try {
    const pending = readQueue(storage);
    for (let offset = 0; offset < pending.length; offset += 20) {
      const batch = pending.slice(offset, offset + 20);
      const result = await postTechnicalTelemetry(batch.map((item) => item.event), {storage: null, fetchImpl});
      if (result.status !== "accepted") break;
      removeQueued(storage, batch.map((item) => item.id));
      accepted += batch.length;
    }
    return accepted;
  } finally { flushing = false; }
}
