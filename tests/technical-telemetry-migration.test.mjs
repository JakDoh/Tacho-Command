import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationSql = fs.readFileSync(
  new URL("../drizzle/0000_technical_telemetry_events.sql", import.meta.url),
  "utf8",
);
const snapshot = JSON.parse(
  fs.readFileSync(new URL("../drizzle/meta/0000_snapshot.json", import.meta.url), "utf8"),
);
const migrationSql1 = fs.readFileSync(
  new URL("../drizzle/0001_technical_telemetry_attempt_code.sql", import.meta.url),
  "utf8",
);
const snapshot1 = JSON.parse(
  fs.readFileSync(new URL("../drizzle/meta/0001_snapshot.json", import.meta.url), "utf8"),
);
const migrationSql2 = fs.readFileSync(
  new URL("../drizzle/0002_product_analytics_events.sql", import.meta.url),
  "utf8",
);
const snapshot2 = JSON.parse(
  fs.readFileSync(new URL("../drizzle/meta/0002_snapshot.json", import.meta.url), "utf8"),
);
const migrationSql3 = fs.readFileSync(
  new URL("../drizzle/0003_card_transfer_telemetry.sql", import.meta.url),
  "utf8",
);
const snapshot3 = JSON.parse(
  fs.readFileSync(new URL("../drizzle/meta/0003_snapshot.json", import.meta.url), "utf8"),
);
const journal = JSON.parse(
  fs.readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
);
const hosting = JSON.parse(
  fs.readFileSync(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
);
const schemaSource = fs.readFileSync(
  new URL("../db/schema.ts", import.meta.url),
  "utf8",
);

const initialColumns = [
  "id",
  "session_id",
  "event",
  "phase",
  "outcome",
  "did",
  "duration_ms",
  "nrc",
  "device_family",
  "error_code",
  "created_at",
];

const latestColumns = [
  "id",
  "session_id",
  "attempt_code",
  "event",
  "phase",
  "outcome",
  "did",
  "duration_ms",
  "nrc",
  "device_family",
  "error_code",
  "packet_count",
  "byte_count",
  "created_at",
];

const forbiddenFields = [
  "driver_name",
  "card_number",
  "registration",
  "vehicle_registration",
  "latitude",
  "longitude",
  "device_name",
  "raw_bytes",
  "raw_payload",
  "actual_value",
];

function schemaStorageColumns(source) {
  const tableStart = source.indexOf("technicalTelemetryEvents = sqliteTable(");
  const indexStart = source.indexOf("(table) => [", tableStart);
  assert.ok(tableStart >= 0 && indexStart > tableStart, "telemetry schema block must be present");
  const tableBlock = source.slice(tableStart, indexStart);
  return [...tableBlock.matchAll(/(?:integer|text)\("([^"]+)"\)/g)].map((match) => match[1]);
}

test("initial telemetry migration contains exactly the privacy-safe storage columns", () => {
  const table = snapshot.tables.technical_telemetry_events;
  assert.ok(table, "technical_telemetry_events snapshot must exist");
  assert.deepEqual(Object.keys(table.columns), initialColumns);

  for (const column of initialColumns) {
    assert.match(migrationSql, new RegExp(`\\b${column}\\b`));
  }
  for (const forbidden of forbiddenFields) {
    assert.doesNotMatch(migrationSql, new RegExp(`\\b${forbidden}\\b`, "i"));
    assert.equal(table.columns[forbidden], undefined);
  }
});

test("schema follows latest snapshot while initial migration stays immutable", () => {
  const schemaColumns = schemaStorageColumns(schemaSource);
  const snapshotColumns = Object.keys(snapshot3.tables.technical_telemetry_events.columns);

  assert.deepEqual(schemaColumns, latestColumns);
  assert.deepEqual(snapshotColumns, latestColumns);

  const createTableBody = migrationSql
    .slice(migrationSql.indexOf("CREATE TABLE"), migrationSql.indexOf(");"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("`") && !line.startsWith("`id` integer PRIMARY KEY") ? true : line.startsWith("`id`"))
    .map((line) => line.match(/^`([^`]+)`/)?.[1])
    .filter(Boolean);

  assert.deepEqual(createTableBody, initialColumns);
});

test("attempt-code migration is additive and nullable for legacy rows", () => {
  assert.match(migrationSql1, /ADD `attempt_code` text/);
  assert.match(migrationSql1, /technical_telemetry_attempt_code_idx/);
  assert.equal(snapshot1.tables.technical_telemetry_events.columns.attempt_code.notNull, false);
});

test("initial telemetry migration creates retention and session indexes", () => {
  assert.match(migrationSql, /technical_telemetry_created_at_idx/);
  assert.match(migrationSql, /technical_telemetry_session_idx/);
  assert.deepEqual(
    Object.keys(snapshot.tables.technical_telemetry_events.indexes),
    ["technical_telemetry_created_at_idx", "technical_telemetry_session_idx"],
  );
});

test("drizzle journal registers telemetry migrations in order", () => {
  assert.equal(journal.dialect, "sqlite");
  assert.equal(journal.entries.length, 4);
  assert.equal(journal.entries[0].idx, 0);
  assert.equal(journal.entries[0].tag, "0000_technical_telemetry_events");
  assert.equal(journal.entries[0].breakpoints, true);
  assert.equal(journal.entries[1].idx, 1);
  assert.equal(journal.entries[1].tag, "0001_technical_telemetry_attempt_code");
  assert.equal(journal.entries[1].breakpoints, true);
  assert.equal(journal.entries[2].idx, 2);
  assert.equal(journal.entries[2].tag, "0002_product_analytics_events");
  assert.equal(journal.entries[2].breakpoints, true);
  assert.equal(journal.entries[3].idx, 3);
  assert.equal(journal.entries[3].tag, "0003_card_transfer_telemetry");
  assert.equal(journal.entries[3].breakpoints, true);
});

test("card telemetry migration adds only bounded transfer counters", () => {
  assert.match(migrationSql3, /ADD `packet_count` integer/);
  assert.match(migrationSql3, /ADD `byte_count` integer/);
  for (const forbidden of forbiddenFields) {
    assert.doesNotMatch(migrationSql3, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
});

test("product analytics migration is separate and privacy-minimal", () => {
  assert.ok(snapshot2.tables.product_analytics_events);
  assert.deepEqual(
    Object.keys(snapshot2.tables.product_analytics_events.columns),
    ["id", "visit_id", "event", "surface", "locale", "source", "created_at"],
  );
  assert.match(migrationSql2, /CREATE TABLE `product_analytics_events`/);
  assert.match(migrationSql2, /product_analytics_created_at_idx/);
  assert.match(migrationSql2, /product_analytics_visit_idx/);
  assert.match(migrationSql2, /product_analytics_event_idx/);
  assert.match(migrationSql2, /product_analytics_surface_idx/);
  for (const forbidden of forbiddenFields) {
    assert.doesNotMatch(migrationSql2, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
});

test("telemetry D1 binding is explicitly named DB once migration prep is complete", () => {
  assert.equal(hosting.d1, "DB");
});
