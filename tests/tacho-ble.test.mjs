import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompatibilityReport,
  classifyTachoServices,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_DOWNLOAD_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../lib/tacho-ble.js";

test("uses the published Smart Tacho 2 download and diagnostics service UUIDs", () => {
  assert.deepEqual(TACHO_OPTIONAL_SERVICE_UUIDS, [
    "eef90782-55dd-4388-b80b-695aba7a69b5",
    "fa213def-aef4-475c-bcea-0a8d69073efc",
  ]);
});

test("classifies only exact normalized standard services", () => {
  const result = classifyTachoServices([
    TACHO_DOWNLOAD_SERVICE_UUID.toUpperCase(),
    "0000180f-0000-1000-8000-00805f9b34fb",
    TACHO_DIAGNOSTICS_SERVICE_UUID,
    TACHO_DOWNLOAD_SERVICE_UUID,
  ]);
  assert.equal(result.hasStandardTachoService, true);
  assert.deepEqual(result.matchedStandardServices, TACHO_OPTIONAL_SERVICE_UUIDS);
  assert.equal(result.normalizedServices.length, 3);
});

test("does not call a generic BLE device a verified tachograph", () => {
  const result = classifyTachoServices(["0000180f-0000-1000-8000-00805f9b34fb"]);
  assert.equal(result.hasStandardTachoService, false);
  assert.deepEqual(result.matchedStandardServices, []);
});

test("compatibility report excludes driver and vehicle identifiers by design", () => {
  const report = buildCompatibilityReport({
    createdAt: "2026-08-18T21:30:00.000Z",
    appVersion: "0.2",
    locale: "de",
    deviceName: "DTCO 4.1",
    connectionState: "linked",
    userAgent: "Test Browser",
    serviceUuids: [TACHO_DOWNLOAD_SERVICE_UUID],
  });
  const serialized = JSON.stringify(report);
  assert.equal(report.standardServiceDetected, true);
  for (const forbidden of ["driverName", "cardNumber", "vehicleRegistration", "location", "rawData"]) {
    assert.equal(serialized.includes(`"${forbidden}"`), false);
  }
  assert.match(report.privacy, /No driver name/);
});
