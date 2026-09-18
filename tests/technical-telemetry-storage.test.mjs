import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routeSource = fs.readFileSync(new URL("../app/api/technical-telemetry/route.ts", import.meta.url), "utf8");
const schemaSource = fs.readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");

test("technical telemetry storage table contains only allow-listed technical fields", () => {
  for (const field of [
    "sessionId",
    "attemptCode",
    "event",
    "phase",
    "outcome",
    "did",
    "durationMs",
    "nrc",
    "deviceFamily",
    "errorCode",
    "createdAt",
  ]) {
    assert.match(schemaSource, new RegExp(`\\b${field}\\b`));
  }

  for (const forbidden of [
    "driverName",
    "cardNumber",
    "registration",
    "vehicleRegistration",
    "latitude",
    "longitude",
    "deviceName",
    "rawBytes",
    "rawPayload",
    "actualValue",
  ]) {
    assert.doesNotMatch(schemaSource, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
});

test("ingest route sanitizes before storage and performs 60-day retention cleanup", () => {
  assert.match(routeSource, /sanitizeTechnicalTelemetryBatch\(input\)/);
  assert.match(routeSource, /technicalTelemetryRetentionCutoffEpochSeconds/);
  assert.match(routeSource, /db\.delete\(technicalTelemetryEvents\)\.where\(lt\(technicalTelemetryEvents\.createdAt, cutoff\)\)/);
  assert.match(routeSource, /db\.insert\(technicalTelemetryEvents\)\.values/);
  assert.match(routeSource, /attemptCode:\s*event\.attemptCode/);
  assert.match(routeSource, /retentionDays:\s*TECHNICAL_TELEMETRY_RETENTION_DAYS/);

  const deletePosition = routeSource.indexOf("db.delete(technicalTelemetryEvents)");
  const insertPosition = routeSource.indexOf("db.insert(technicalTelemetryEvents)");
  assert.ok(deletePosition >= 0 && insertPosition > deletePosition, "retention cleanup must run before insert");
});

test("ingest route fails closed without leaking storage errors or payload values", () => {
  assert.match(routeSource, /status:\s*"storage_unavailable"/);
  assert.match(routeSource, /status:\s*503/);
  assert.match(routeSource, /"cache-control":\s*"no-store"/);
  assert.doesNotMatch(routeSource, /error\.message/);
  assert.doesNotMatch(routeSource, /JSON\.stringify\(payload\)/);
  assert.doesNotMatch(routeSource, /console\.(log|error|warn)\(/);
});

test("ingest route stores server receipt time rather than client-supplied timestamps", () => {
  assert.match(routeSource, /const createdAt = Math\.floor\(Date\.now\(\) \/ 1000\)/);
  assert.match(routeSource, /createdAt,/);
  assert.doesNotMatch(routeSource, /event\.createdAt/);
  assert.doesNotMatch(routeSource, /event\.timestamp/);
});
