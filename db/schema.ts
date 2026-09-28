import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const technicalTelemetryEvents = sqliteTable(
  "technical_telemetry_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    attemptCode: text("attempt_code"),
    event: text("event").notNull(),
    phase: text("phase").notNull(),
    outcome: text("outcome").notNull(),
    did: text("did"),
    durationMs: integer("duration_ms"),
    nrc: integer("nrc"),
    deviceFamily: text("device_family").notNull(),
    errorCode: text("error_code"),
    packetCount: integer("packet_count"),
    byteCount: integer("byte_count"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("technical_telemetry_created_at_idx").on(table.createdAt),
    index("technical_telemetry_session_idx").on(table.sessionId),
    index("technical_telemetry_attempt_code_idx").on(table.attemptCode),
  ],
);


export const productAnalyticsEvents = sqliteTable(
  "product_analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    visitId: text("visit_id").notNull(),
    event: text("event").notNull(),
    surface: text("surface").notNull(),
    locale: text("locale").notNull(),
    source: text("source").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("product_analytics_created_at_idx").on(table.createdAt),
    index("product_analytics_visit_idx").on(table.visitId),
    index("product_analytics_event_idx").on(table.event),
    index("product_analytics_surface_idx").on(table.surface),
  ],
);
