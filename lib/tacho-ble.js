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
  return Object.freeze({
    schema: "tachocommand-ble-compatibility-v1",
    createdAt: cleanText(input.createdAt, 40),
    appVersion: cleanText(input.appVersion, 40),
    locale: cleanText(input.locale, 10),
    deviceName: cleanText(input.deviceName, 80) || "unknown",
    connectionState: cleanText(input.connectionState, 30),
    userAgent: cleanText(input.userAgent, 300),
    standardServiceDetected: classification.hasStandardTachoService,
    matchedStandardServices: classification.matchedStandardServices,
    discoveredPrimaryServices: classification.normalizedServices,
    privacy: "No driver name, card number, vehicle registration, location, or raw tachograph data is included.",
  });
}
