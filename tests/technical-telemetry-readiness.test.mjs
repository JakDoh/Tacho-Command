import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routeSource = fs.readFileSync(
  new URL("../app/api/technical-telemetry/route.ts", import.meta.url),
  "utf8",
);

test("telemetry GET probe verifies storage without returning telemetry rows", () => {
  assert.match(routeSource, /export async function GET\(\)/);
  assert.match(routeSource, /db\.select\(\{ id: technicalTelemetryEvents\.id \}\)\.from\(technicalTelemetryEvents\)\.limit\(1\)/);
  assert.match(routeSource, /status:\s*"ready"/);
  assert.match(routeSource, /schema:\s*TECHNICAL_TELEMETRY_SCHEMA/);
  assert.match(routeSource, /retentionDays:\s*TECHNICAL_TELEMETRY_RETENTION_DAYS/);
  assert.match(routeSource, /status:\s*"storage_unavailable"/);

  const getStart = routeSource.indexOf("export async function GET()");
  const postStart = routeSource.indexOf("export async function POST", getStart);
  const getBody = routeSource.slice(getStart, postStart);
  assert.doesNotMatch(getBody, /\.insert\(/);
  assert.doesNotMatch(getBody, /\.delete\(/);
  assert.doesNotMatch(getBody, /sessionId|deviceFamily|errorCode|durationMs|nrc|did:/);
});

test("telemetry readiness responses remain non-cacheable", () => {
  assert.match(routeSource, /"cache-control":\s*"no-store"/);
});
