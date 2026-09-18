import assert from "node:assert/strict";
import test from "node:test";

import {
  TECHNICAL_TELEMETRY_MAX_BATCH,
  TECHNICAL_TELEMETRY_RETENTION_DAYS,
  sanitizeTechnicalTelemetryBatch,
  sanitizeTechnicalTelemetryEvent,
  technicalTelemetryRetentionCutoffEpochSeconds,
} from "../lib/technical-telemetry.js";

const SESSION_ID = "123e4567-e89b-42d3-a456-426614174000";

test("technical telemetry keeps the public contract minimal and privacy-safe", () => {
  const event = sanitizeTechnicalTelemetryEvent({
    sessionId: SESSION_ID,
    event: "did_read",
    phase: "live_read",
    outcome: "positive",
    did: "F923",
    durationMs: 412,
    nrc: null,
    deviceFamily: "vdo-dtco-4x",
    errorCode: null,
    driverName: "Jane Driver",
    cardNumber: "secret-card",
    vehicleRegistration: "W-SECRET",
    location: "48.2,16.3",
    bluetoothName: "DTCO-REAL-DEVICE-NAME",
    rawBytes: [0x62, 0xf9, 0x23, 0x00, 0x7b],
    value: 123,
  });

  assert.deepEqual(event, {
    schema: "tc-tech-v1",
    sessionId: SESSION_ID,
    attemptCode: null,
    event: "did_read",
    phase: "live_read",
    outcome: "positive",
    did: "F923",
    durationMs: 412,
    nrc: null,
    deviceFamily: "vdo-dtco-4x",
    errorCode: null,
  });

  for (const forbidden of [
    "driverName",
    "cardNumber",
    "vehicleRegistration",
    "location",
    "bluetoothName",
    "rawBytes",
    "value",
  ]) {
    assert.equal(Object.hasOwn(event, forbidden), false, `${forbidden} must never survive sanitization`);
  }
});

test("technical telemetry rejects unknown DIDs and malformed session identifiers", () => {
  assert.equal(sanitizeTechnicalTelemetryEvent({
    sessionId: SESSION_ID,
    event: "did_read",
    phase: "live_read",
    outcome: "positive",
    did: "F90B",
  }), null);

  assert.equal(sanitizeTechnicalTelemetryEvent({
    sessionId: "driver-123",
    event: "connect_start",
    phase: "bluetooth",
    outcome: "start",
  }), null);
});

test("technical telemetry normalizes unsafe enum values instead of storing free text", () => {
  const event = sanitizeTechnicalTelemetryEvent({
    sessionId: SESSION_ID,
    event: "error",
    phase: "gatt",
    outcome: "error",
    deviceFamily: "VDO DTCO 4.1a serial 123456",
    errorCode: "TypeError: driver Jane at vehicle W-SECRET",
  });

  assert.equal(event.deviceFamily, "unknown");
  assert.equal(event.errorCode, "unknown");
});

test("technical telemetry bounds duration, NRC and batch size", () => {
  const invalid = sanitizeTechnicalTelemetryEvent({
    sessionId: SESSION_ID,
    event: "nrc",
    phase: "live_read",
    outcome: "nrc",
    did: "F903",
    durationMs: 999_999_999,
    nrc: 999,
  });

  assert.equal(invalid.durationMs, null);
  assert.equal(invalid.nrc, null);

  const input = Array.from({ length: TECHNICAL_TELEMETRY_MAX_BATCH + 10 }, (_, index) => ({
    sessionId: SESSION_ID,
    event: "connect_start",
    phase: "bluetooth",
    outcome: "start",
    durationMs: index,
  }));

  assert.equal(sanitizeTechnicalTelemetryBatch(input).length, TECHNICAL_TELEMETRY_MAX_BATCH);
});

test("technical telemetry retention cutoff is exactly 60 days", () => {
  assert.equal(TECHNICAL_TELEMETRY_RETENTION_DAYS, 60);
  const nowMs = Date.UTC(2026, 8, 16, 20, 0, 0);
  const expected = Math.floor(nowMs / 1000) - 60 * 24 * 60 * 60;
  assert.equal(technicalTelemetryRetentionCutoffEpochSeconds(nowMs), expected);
});
