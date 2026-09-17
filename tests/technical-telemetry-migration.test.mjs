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

const expectedColumns = [
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
  assert.deepEqual(Object.keys(table.columns), expectedColumns);

  for (const column of expectedColumns) {
    assert.match(migrationSql, new RegExp(`\\b${column}\\b`));
  }
  for (const forbidden of forbiddenFields) {
    assert.doesNotMatch(migrationSql, new RegExp(`\\b${forbidden}\\b`, "i"));
    assert.equal(table.columns[forbidden], undefined);
  }
});

test("schema, snapshot, and initial migration cannot silently drift", () => {
  const schemaColumns = schemaStorageColumns(schemaSource);
  const snapshotColumns = Object.keys(snapshot.tables.technical_telemetry_events.columns);

  assert.deepEqual(schemaColumns, expectedColumns);
  assert.deepEqual(snapshotColumns, expectedColumns);

  const createTableBody = migrationSql
    .slice(migrationSql.indexOf("CREATE TABLE"), migrationSql.indexOf(");"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("`") && !line.startsWith("`id` integer PRIMARY KEY") ? true : line.startsWith("`id`"))
    .map((line) => line.match(/^`([^`]+)`/)?.[1])
    .filter(Boolean);

  assert.deepEqual(createTableBody, expectedColumns);
});

test("initial telemetry migration creates retention and session indexes", () => {
  assert.match(migrationSql, /technical_telemetry_created_at_idx/);
  assert.match(migrationSql, /technical_telemetry_session_idx/);
  assert.deepEqual(
    Object.keys(snapshot.tables.technical_telemetry_events.indexes),
    ["technical_telemetry_created_at_idx", "technical_telemetry_session_idx"],
  );
});

test("drizzle journal registers exactly the initial telemetry migration", () => {
  assert.equal(journal.dialect, "sqlite");
  assert.equal(journal.entries.length, 1);
  assert.equal(journal.entries[0].idx, 0);
  assert.equal(journal.entries[0].tag, "0000_technical_telemetry_events");
  assert.equal(journal.entries[0].breakpoints, true);
});

test("telemetry D1 binding is explicitly named DB once migration prep is complete", () => {
  assert.equal(hosting.d1, "DB");
});
