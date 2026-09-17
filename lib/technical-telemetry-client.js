import { sanitizeTechnicalTelemetryBatch } from "./technical-telemetry.js";

const DEFAULT_ENDPOINT = "/api/technical-telemetry";
const DEFAULT_TIMEOUT_MS = 3000;

export async function postTechnicalTelemetry(
  events,
  {
    endpoint = DEFAULT_ENDPOINT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
  } = {},
) {
  const safeEvents = sanitizeTechnicalTelemetryBatch(events);
  if (safeEvents.length === 0) {
    return Object.freeze({ status: "no_valid_events", accepted: 0 });
  }

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
    try {
      payload = await response.json();
    } catch {}

    if (response.status === 202 && payload?.status === "accepted") {
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
