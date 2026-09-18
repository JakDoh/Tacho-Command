import { lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { technicalTelemetryEvents } from "../../../db/schema";
import {
  TECHNICAL_TELEMETRY_RETENTION_DAYS,
  TECHNICAL_TELEMETRY_SCHEMA,
  sanitizeTechnicalTelemetryBatch,
  technicalTelemetryRetentionCutoffEpochSeconds,
} from "../../../lib/technical-telemetry.js";

const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });

export async function GET() {
  try {
    const db = await getDb();
    await db.select({ id: technicalTelemetryEvents.id }).from(technicalTelemetryEvents).limit(1);

    return json({
      status: "ready",
      schema: TECHNICAL_TELEMETRY_SCHEMA,
      retentionDays: TECHNICAL_TELEMETRY_RETENTION_DAYS,
    });
  } catch {
    return json({ status: "storage_unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ status: "invalid_json" }, { status: 400 });
  }

  const input = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as { events?: unknown }).events
    : null;
  const events = sanitizeTechnicalTelemetryBatch(input);
  if (events.length === 0) {
    return json({ status: "no_valid_events" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const createdAt = Math.floor(Date.now() / 1000);
    const cutoff = technicalTelemetryRetentionCutoffEpochSeconds(createdAt * 1000);

    await db.delete(technicalTelemetryEvents).where(lt(technicalTelemetryEvents.createdAt, cutoff));
    await db.insert(technicalTelemetryEvents).values(
      events.map((event) => ({
        sessionId: event.sessionId,
        attemptCode: event.attemptCode,
        event: event.event,
        phase: event.phase,
        outcome: event.outcome,
        did: event.did,
        durationMs: event.durationMs,
        nrc: event.nrc,
        deviceFamily: event.deviceFamily,
        errorCode: event.errorCode,
        createdAt,
      })),
    );

    return json(
      {
        status: "accepted",
        accepted: events.length,
        retentionDays: TECHNICAL_TELEMETRY_RETENTION_DAYS,
      },
      { status: 202 },
    );
  } catch {
    return json({ status: "storage_unavailable" }, { status: 503 });
  }
}
