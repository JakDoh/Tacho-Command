import { lt } from "drizzle-orm";
import type { getDb } from "../db";
import { technicalTelemetryEvents } from "../db/schema";
import type { sanitizeTechnicalTelemetryBatch } from "./technical-telemetry.js";

export async function storeTechnicalTelemetry(
  db: Awaited<ReturnType<typeof getDb>>,
  events: ReturnType<typeof sanitizeTechnicalTelemetryBatch>,
  createdAt: number,
  cutoff: number,
) {
  // D1 permits at most 100 bound parameters per statement. A final card report
  // contains several events; one multi-row INSERT can exceed that limit.
  // A D1 batch is atomic, so acknowledge only after every event is committed.
  const statements = events.map((event) => db.insert(technicalTelemetryEvents).values({
    sessionId: event.sessionId, attemptCode: event.attemptCode,
    event: event.event, phase: event.phase, outcome: event.outcome,
    did: event.did, durationMs: event.durationMs, nrc: event.nrc,
    deviceFamily: event.deviceFamily, errorCode: event.errorCode,
    stage: event.stage, lastConfirmedStage: event.lastConfirmedStage,
    packetCount: event.packetCount, byteCount: event.byteCount, createdAt,
  }));
  const [first, ...rest] = statements;
  if (!first) return;
  await db.batch([
    db.delete(technicalTelemetryEvents).where(lt(technicalTelemetryEvents.createdAt, cutoff)),
    first, ...rest,
  ]);
}
