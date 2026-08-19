export const TACHO_DOWNLOAD_SERVICE_UUID = "eef90782-55dd-4388-b80b-695aba7a69b5";
export const TACHO_DIAGNOSTICS_SERVICE_UUID = "fa213def-aef4-475c-bcea-0a8d69073efc";
export const TACHO_DOWNLOAD_FIFO_UUID = "29d3a479-1592-47df-80a4-afa742d369bb";
export const TACHO_DOWNLOAD_CREDITS_UUID = "db9c4128-bff3-41fe-a306-fb6f9a8aeb2d";
export const TACHO_DIAGNOSTICS_FIFO_UUID = "e413960c-75ba-4ca9-8a67-99bc052a1b13";
export const TACHO_DIAGNOSTICS_CREDITS_UUID = "e168d1a6-304f-42b4-ab96-4cd1d4efebd9";
export const TACHO_OPTIONAL_SERVICE_UUIDS = Object.freeze([
  TACHO_DOWNLOAD_SERVICE_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
]);

function normalizeUuid(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function classifyTachoServices(serviceUuids = []) {
  const normalizedServices = [...new Set(serviceUuids.map(normalizeUuid).filter(Boolean))].sort();
  const matchedStandardServices = normalizedServices.filter((uuid) =>
    TACHO_OPTIONAL_SERVICE_UUIDS.includes(uuid)
  );
  return Object.freeze({
    normalizedServices: Object.freeze(normalizedServices),
    matchedStandardServices: Object.freeze(matchedStandardServices),
    hasStandardTachoService: matchedStandardServices.length > 0,
  });
}

export function classifyTachoTransport(serviceCharacteristics = []) {
  const normalized = serviceCharacteristics.map((entry) => ({
    serviceUuid: normalizeUuid(entry?.serviceUuid),
    characteristicUuids: [...new Set((entry?.characteristicUuids ?? []).map(normalizeUuid).filter(Boolean))].sort(),
  })).filter((entry) => entry.serviceUuid);
  const lookup = new Map(normalized.map((entry) => [entry.serviceUuid, entry.characteristicUuids]));
  const download = lookup.get(TACHO_DOWNLOAD_SERVICE_UUID) ?? [];
  const diagnostics = lookup.get(TACHO_DIAGNOSTICS_SERVICE_UUID) ?? [];
  const checks = Object.freeze({
    downloadFifo: download.includes(TACHO_DOWNLOAD_FIFO_UUID),
    downloadCredits: download.includes(TACHO_DOWNLOAD_CREDITS_UUID),
    diagnosticsFifo: diagnostics.includes(TACHO_DIAGNOSTICS_FIFO_UUID),
    diagnosticsCredits: diagnostics.includes(TACHO_DIAGNOSTICS_CREDITS_UUID),
  });
  return Object.freeze({
    serviceCharacteristics: Object.freeze(normalized.map((entry) => Object.freeze({
      serviceUuid: entry.serviceUuid,
      characteristicUuids: Object.freeze(entry.characteristicUuids),
    }))),
    checks,
    transportReady: Object.values(checks).every(Boolean),
  });
}

export function classifyFlowControl(input = {}) {
  const serverCredits = (Array.isArray(input.serverCredits) ? input.serverCredits : [])
    .map((value) => Math.floor(Number(value)))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 255)
    .slice(-20);
  const rejected = serverCredits.includes(0xff);
  const accepted = serverCredits.some((value) => value > 0 && value < 0xff);
  return Object.freeze({
    attempted: Boolean(input.attempted),
    diagnosticsFifoIndications: Boolean(input.diagnosticsFifoIndications),
    diagnosticsCreditsIndications: Boolean(input.diagnosticsCreditsIndications),
    clientCreditsGranted: Math.min(254, Math.max(0, Math.floor(Number(input.clientCreditsGranted) || 0))),
    serverCreditsReceived: Object.freeze(serverCredits),
    creditWriteCapabilities: Object.freeze({
      write: Boolean(input.creditWriteCapabilities?.write),
      writeWithoutResponse: Boolean(input.creditWriteCapabilities?.writeWithoutResponse),
    }),
    creditWriteAttempts: Object.freeze((Array.isArray(input.creditWriteAttempts) ? input.creditWriteAttempts : [])
      .map((value) => cleanText(value, 40)).filter(Boolean).slice(-5)),
    creditWriteMethod: cleanText(input.creditWriteMethod, 40) || "not-used",
    errorName: cleanText(input.errorName, 80) || "none",
    errorMessage: cleanText(input.errorMessage, 180) || "none",
    rejected,
    ready: Boolean(input.attempted) && !rejected && accepted,
  });
}

export function classifyApplicationProbe(input = {}) {
  const status = cleanText(input.status, 30) || "idle";
  const responseService = Number.isInteger(input.responseService) && input.responseService >= 0 && input.responseService <= 255
    ? input.responseService : null;
  const negativeResponseCode = Number.isInteger(input.negativeResponseCode) && input.negativeResponseCode >= 0 && input.negativeResponseCode <= 255
    ? input.negativeResponseCode : null;
  return Object.freeze({
    attempted: Boolean(input.attempted),
    request: "uds-tester-present",
    status,
    fifoWriteCapabilities: Object.freeze({
      write: Boolean(input.fifoWriteCapabilities?.write),
      writeWithoutResponse: Boolean(input.fifoWriteCapabilities?.writeWithoutResponse),
    }),
    fifoWriteAttempts: Object.freeze((Array.isArray(input.fifoWriteAttempts) ? input.fifoWriteAttempts : [])
      .map((value) => cleanText(value, 40)).filter(Boolean).slice(-5)),
    fifoWriteMethod: cleanText(input.fifoWriteMethod, 40) || "not-used",
    packetHeaderValid: Boolean(input.packetHeaderValid),
    responseType: cleanText(input.responseType, 30) || "none",
    responseService,
    negativeResponseCode,
    errorName: cleanText(input.errorName, 80) || "none",
    errorMessage: cleanText(input.errorMessage, 180) || "none",
    ready: status === "positive" && responseService === 0x7e,
  });
}

export function classifyRemoteHmi(input = {}) {
  const state = cleanText(input.state, 30) || "idle";
  const statusCode = Number.isInteger(input.statusCode) && input.statusCode >= 0 && input.statusCode <= 255
    ? input.statusCode : null;
  const statusNames = new Map([
    [0x00, "closed-open-possible"],
    [0x01, "user-decision-pending"],
    [0x10, "open"],
    [0x20, "user-rejected"],
    [0x21, "local-hmi-in-use"],
    [0x2f, "conditions-not-met"],
  ]);
  return Object.freeze({
    attempted: Boolean(input.attempted),
    routineIdentifier: "F211",
    startResponse: cleanText(input.startResponse, 30) || "none",
    state,
    statusCode,
    statusName: statusCode === null ? "none" : statusNames.get(statusCode) ?? "unknown",
    pollCount: Math.min(20, Math.max(0, Math.floor(Number(input.pollCount) || 0))),
    recoveryStatusQueried: Boolean(input.recoveryStatusQueried),
    errorName: cleanText(input.errorName, 80) || "none",
    errorMessage: cleanText(input.errorMessage, 180) || "none",
    ready: state === "open" && statusCode === 0x10,
  });
}

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLength);
}

export function buildCompatibilityReport(input = {}) {
  const classification = classifyTachoServices(input.serviceUuids);
  const transport = classifyTachoTransport(input.serviceCharacteristics);
  const flowControl = classifyFlowControl(input.flowControl);
  const applicationProbe = classifyApplicationProbe(input.applicationProbe);
  const remoteHmi = classifyRemoteHmi(input.remoteHmi);
  const events = Array.isArray(input.events)
    ? input.events.slice(-40).map((entry) => Object.freeze({
      at: cleanText(entry?.at, 40),
      event: cleanText(entry?.event, 40),
    })).filter((entry) => entry.at && entry.event)
    : [];
  return Object.freeze({
    schema: "tachocommand-field-test-v7",
    createdAt: cleanText(input.createdAt, 40),
    appVersion: cleanText(input.appVersion, 40),
    locale: cleanText(input.locale, 10),
    vehicleType: cleanText(input.vehicleType, 20) || "not-set",
    tachoBrand: cleanText(input.tachoBrand, 30) || "not-set",
    tachoModel: cleanText(input.tachoModel, 60) || "not-set",
    deviceName: cleanText(input.deviceName, 80) || "unknown",
    connectionState: cleanText(input.connectionState, 30),
    sessionStartedAt: cleanText(input.sessionStartedAt, 40) || "not-started",
    sessionDurationSeconds: Math.max(0, Math.floor(Number(input.sessionDurationSeconds) || 0)),
    attemptCount: Math.max(0, Math.floor(Number(input.attemptCount) || 0)),
    disconnectCount: Math.max(0, Math.floor(Number(input.disconnectCount) || 0)),
    userAgent: cleanText(input.userAgent, 300),
    standardServiceDetected: classification.hasStandardTachoService,
    matchedStandardServices: classification.matchedStandardServices,
    discoveredPrimaryServices: classification.normalizedServices,
    transportReady: transport.transportReady,
    transportChecks: transport.checks,
    discoveredCharacteristics: transport.serviceCharacteristics,
    flowControl,
    applicationProbe,
    remoteHmi,
    events: Object.freeze(events),
    privacy: "No driver name, card number, vehicle registration, location, or raw tachograph data is included.",
  });
}
