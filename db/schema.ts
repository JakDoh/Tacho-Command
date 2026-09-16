import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const technicalTelemetryEvents = sqliteTable(
  "technical_telemetry_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    event: text("event").notNull(),
    phase: text("phase").notNull(),
    outcome: text("outcome").notNull(),
    did: text("did"),
    durationMs: integer("duration_ms"),
    nrc: integer("nrc"),
    deviceFamily: text("device_family").notNull(),
    errorCode: text("error_code"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("technical_telemetry_created_at_idx").on(table.createdAt),
    index("technical_telemetry_session_idx").on(table.sessionId),
  ],
);
