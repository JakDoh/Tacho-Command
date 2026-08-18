export const TACHO_DOWNLOAD_SERVICE_UUID = "eef90782-55dd-4388-b80b-695aba7a69b5";
export const TACHO_DIAGNOSTICS_SERVICE_UUID = "fa213def-aef4-475c-bcea-0a8d69073efc";
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

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLength);
}

export function buildCompatibilityReport(input = {}) {
  const classification = classifyTachoServices(input.serviceUuids);
  const events = Array.isArray(input.events)
    ? input.events.slice(-40).map((entry) => Object.freeze({
      at: cleanText(entry?.at, 40),
      event: cleanText(entry?.event, 40),
    })).filter((entry) => entry.at && entry.event)
    : [];
  return Object.freeze({
    schema: "tachocommand-field-test-v2",
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
    events: Object.freeze(events),
    privacy: "No driver name, card number, vehicle registration, location, or raw tachograph data is included.",
  });
}
