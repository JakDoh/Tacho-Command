import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompatibilityReport,
  classifyApplicationProbe,
  classifyDiagnosticSession,
  classifyDriverCardRead,
  classifyFlowControl,
  classifyRemoteHmi,
  classifyTachoServices,
  classifyTachoTransport,
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_DOWNLOAD_CREDITS_UUID,
  TACHO_DOWNLOAD_FIFO_UUID,
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

test("requires all four official FIFO and credits characteristics", () => {
  const complete = classifyTachoTransport([
    { serviceUuid: TACHO_DOWNLOAD_SERVICE_UUID, characteristicUuids: [TACHO_DOWNLOAD_FIFO_UUID, TACHO_DOWNLOAD_CREDITS_UUID] },
    { serviceUuid: TACHO_DIAGNOSTICS_SERVICE_UUID, characteristicUuids: [TACHO_DIAGNOSTICS_FIFO_UUID, TACHO_DIAGNOSTICS_CREDITS_UUID] },
  ]);
  assert.equal(complete.transportReady, true);
  assert.deepEqual(complete.checks, {
    downloadFifo: true,
    downloadCredits: true,
    diagnosticsFifo: true,
    diagnosticsCredits: true,
  });
  assert.equal(classifyTachoTransport([
    { serviceUuid: TACHO_DOWNLOAD_SERVICE_UUID, characteristicUuids: [TACHO_DOWNLOAD_FIFO_UUID] },
  ]).transportReady, false);
});

test("accepts only a positive non-rejection server credit as a ready flow-control channel", () => {
  const ready = classifyFlowControl({
    attempted: true,
    diagnosticsFifoIndications: true,
    diagnosticsCreditsIndications: true,
    clientCreditsGranted: 1,
    serverCredits: [4],
    creditWriteCapabilities: { write: true, writeWithoutResponse: true },
    creditWriteAttempts: ["with-response", "without-response"],
    creditWriteMethod: "without-response",
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.rejected, false);
  assert.deepEqual(ready.serverCreditsReceived, [4]);
  assert.equal(ready.creditWriteCapabilities.writeWithoutResponse, true);
  assert.deepEqual(ready.creditWriteAttempts, ["with-response", "without-response"]);
  assert.equal(ready.creditWriteMethod, "without-response");
  assert.equal(classifyFlowControl({ attempted: true, serverCredits: [0xff] }).rejected, true);
  assert.equal(classifyFlowControl({ attempted: true, serverCredits: [0] }).ready, false);
});

test("classifies only a valid positive TesterPresent response as application-ready", () => {
  const positive = classifyApplicationProbe({
    attempted: true,
    status: "positive",
    fifoWriteCapabilities: { writeWithoutResponse: true },
    fifoWriteAttempts: ["without-response"],
    fifoWriteMethod: "without-response",
    packetHeaderValid: true,
    responseType: "positive",
    responseService: 0x7e,
  });
  assert.equal(positive.ready, true);
  assert.equal(positive.request, "uds-tester-present");
  assert.equal(classifyApplicationProbe({ attempted: true, status: "negative", responseService: 0x7f, negativeResponseCode: 0x22 }).ready, false);
});

test("requires a positive default diagnostic session response before Remote HMI", () => {
  const positive = classifyDiagnosticSession({
    attempted: true,
    status: "positive",
    packetHeaderValid: true,
    responseType: "positive",
    responseService: 0x50,
    responseSubFunction: 0x01,
  });
  assert.equal(positive.ready, true);
  assert.equal(positive.request, "uds-default-diagnostic-session");
  assert.equal(classifyDiagnosticSession({ attempted: true, status: "negative", responseService: 0x7f, negativeResponseCode: 0x22 }).ready, false);
});

test("classifies only status 0x10 as an open Remote HMI session", () => {
  const open = classifyRemoteHmi({ attempted: true, startResponse: "positive", state: "open", statusCode: 0x10, pollCount: 2 });
  assert.equal(open.ready, true);
  assert.equal(open.routineIdentifier, "F211");
  assert.equal(open.statusName, "open");
  assert.equal(classifyRemoteHmi({ attempted: true, state: "pending", statusCode: 0x01 }).ready, false);
  assert.equal(classifyRemoteHmi({ attempted: true, state: "rejected", statusCode: 0x20 }).statusName, "user-rejected");
  assert.equal(classifyRemoteHmi({ attempted: true, startResponse: "timeout", recoveryStatusQueried: true }).recoveryStatusQueried, true);
});

test("sanitizes read-only driver-card values without identifiers or raw bytes", () => {
  const result = classifyDriverCardRead({
    attempted: true,
    results: [
      { did: "f903", name: "driver-working-state", status: "positive", value: 3, unit: "state", activity: "drive", rawBytes: [3] },
      { did: "F923", name: "continuous-driving-time", status: "positive", value: 222, unit: "minutes", cardNumber: "secret" },
    ],
  });
  assert.equal(result.ready, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.positiveCount, 2);
  assert.equal(result.results[0].did, "F903");
  assert.equal(result.results[1].value, 222);
  assert.equal("rawBytes" in result.results[0], false);
  assert.equal("cardNumber" in result.results[1], false);
});

test("compatibility report excludes driver and vehicle identifiers by design", () => {
  const report = buildCompatibilityReport({
    createdAt: "2026-08-18T21:30:00.000Z",
    appVersion: "0.2",
    locale: "de",
    vehicleType: "bus",
    tachoBrand: "VDO",
    tachoModel: "DTCO 4.1a",
    deviceName: "DTCO 4.1",
    connectionState: "linked",
    sessionStartedAt: "2026-08-18T21:29:00.000Z",
    sessionDurationSeconds: 60.9,
    attemptCount: 2,
    disconnectCount: 1,
    userAgent: "Test Browser",
    serviceUuids: [TACHO_DOWNLOAD_SERVICE_UUID],
    serviceCharacteristics: [
      { serviceUuid: TACHO_DOWNLOAD_SERVICE_UUID, characteristicUuids: [TACHO_DOWNLOAD_FIFO_UUID, TACHO_DOWNLOAD_CREDITS_UUID] },
    ],
    flowControl: {
      attempted: true,
      diagnosticsFifoIndications: true,
      diagnosticsCreditsIndications: true,
      clientCreditsGranted: 1,
      serverCredits: [2],
      creditWriteCapabilities: { write: true, writeWithoutResponse: false },
      creditWriteAttempts: ["with-response"],
      creditWriteMethod: "with-response",
    },
    applicationProbe: {
      attempted: true,
      status: "positive",
      fifoWriteCapabilities: { writeWithoutResponse: true },
      fifoWriteAttempts: ["without-response"],
      fifoWriteMethod: "without-response",
      packetHeaderValid: true,
      responseType: "positive",
      responseService: 0x7e,
    },
    diagnosticSession: {
      attempted: true,
      status: "positive",
      packetHeaderValid: true,
      responseType: "positive",
      responseService: 0x50,
      responseSubFunction: 0x01,
    },
    remoteHmi: {
      attempted: true,
      startResponse: "positive",
      state: "open",
      statusCode: 0x10,
      pollCount: 2,
      recoveryStatusQueried: false,
    },
    driverCardRead: {
      attempted: true,
      results: [
        { did: "F903", name: "driver-working-state", status: "positive", value: 0, unit: "state", activity: "rest" },
        { did: "F923", name: "continuous-driving-time", status: "positive", value: 45, unit: "minutes" },
      ],
    },
    events: [
      { at: "2026-08-18T21:29:00.000Z", event: "connection-attempt", secret: "removed" },
      { at: "2026-08-18T21:30:00.000Z", event: "services-scanned" },
    ],
  });
  const serialized = JSON.stringify(report);
  assert.equal(report.standardServiceDetected, true);
  for (const forbidden of ["driverName", "cardNumber", "vehicleRegistration", "location", "rawData"]) {
    assert.equal(serialized.includes(`"${forbidden}"`), false);
  }
  assert.match(report.privacy, /No driver name/);
  assert.equal(report.schema, "tachocommand-field-test-v9");
  assert.equal(report.vehicleType, "bus");
  assert.equal(report.tachoBrand, "VDO");
  assert.equal(report.sessionDurationSeconds, 60);
  assert.equal(report.events.length, 2);
  assert.equal(report.transportReady, false);
  assert.equal(report.transportChecks.downloadFifo, true);
  assert.equal(report.flowControl.ready, true);
  assert.deepEqual(report.flowControl.serverCreditsReceived, [2]);
  assert.equal(report.applicationProbe.ready, true);
  assert.equal(report.diagnosticSession.ready, true);
  assert.equal(report.remoteHmi.ready, true);
  assert.equal(report.driverCardRead.ready, true);
  assert.equal(report.driverCardRead.positiveCount, 2);
  assert.equal("rawBytes" in report.applicationProbe, false);
  assert.deepEqual(Object.keys(report.events[0]), ["at", "event"]);
});
