export const OPEN_RHMI_ROUTINE_ID = 0xf211;

export const RHMI_DIDS = Object.freeze({
  TACHOGRAPH_VEHICLE_SPEED: 0xf902,
  DRIVER_1_WORKING_STATE: 0xf903,
  DRIVER_1_CONTINUOUS_DRIVING: 0xf923,
  DRIVER_1_CUMULATIVE_BREAK: 0xf925,
  DRIVER_1_CURRENT_DAILY_DRIVING: 0xf99a,
  DRIVER_1_CURRENT_WEEKLY_DRIVING: 0xf99b,
});

export function buildTesterPresentRequest() {
  return Object.freeze([0x3e, 0x00]);
}

export function buildOpenRhmiStartRequest() {
  return Object.freeze([0x31, 0x01, 0xf2, 0x11]);
}

export function buildOpenRhmiStatusRequest() {
  return Object.freeze([0x31, 0x03, 0xf2, 0x11]);
}

export function buildReadDataByIdentifier(did) {
  const high = (did >> 8) & 0xff;
  const low = did & 0xff;
  return Object.freeze([0x22, high, low]);
}

export function classifyOpenRhmiPacket(packet = []) {
  const bytes = Array.from(packet, (value) => Number(value) & 0xff);
  const packetHeaderValid = bytes[0] === 1 && bytes[1] === 1;
  const responseService = packetHeaderValid ? bytes[2] ?? null : null;
  const negative = packetHeaderValid && responseService === 0x7f && bytes[3] === 0x31;
  const startPositive = packetHeaderValid
    && responseService === 0x71
    && bytes[3] === 0x01
    && bytes[4] === 0xf2
    && bytes[5] === 0x11;
  const statusPositive = packetHeaderValid
    && responseService === 0x71
    && bytes[3] === 0x03
    && bytes[4] === 0xf2
    && bytes[5] === 0x11;

  return Object.freeze({
    packetHeaderValid,
    responseService,
    responseType: startPositive ? "start-positive" : statusPositive ? "status-positive" : negative ? "negative" : "unexpected",
    routineControlType: startPositive || statusPositive ? bytes[3] : null,
    routineIdentifier: startPositive || statusPositive ? "F211" : null,
    statusCode: statusPositive ? bytes[6] ?? null : null,
    negativeResponseCode: negative ? bytes[4] ?? null : null,
  });
}

export function parseDriverWorkingState(responseBytes = []) {
  const bytes = Array.from(responseBytes, (value) => Number(value) & 0xff);
  if (bytes.length < 6 || bytes[0] !== 1 || bytes[1] !== 1 || bytes[2] !== 0x62 || bytes[3] !== 0xf9 || bytes[4] !== 0x03) {
    return Object.freeze({ valid: false, activity: "unknown" });
  }
  const activityByte = bytes[5] ?? 0xff;
  if ((activityByte & 0xf8) !== 0) return Object.freeze({ valid: false, activity: "unknown" });
  const stateCode = activityByte & 0x07;
  const activity = stateCode === 0 ? "rest" : stateCode === 1 ? "available" : stateCode === 2 ? "work" : stateCode === 3 ? "drive" : "unknown";
  return Object.freeze({ valid: true, activity, activityCode: stateCode });
}

export function parseDriverMinutesDid(responseBytes = [], expectedDid) {
  const bytes = Array.from(responseBytes, (value) => Number(value) & 0xff);
  const didHigh = (expectedDid >> 8) & 0xff;
  const didLow = expectedDid & 0xff;
  if (bytes.length < 7 || bytes[0] !== 1 || bytes[1] !== 1 || bytes[2] !== 0x62 || bytes[3] !== didHigh || bytes[4] !== didLow) {
    return Object.freeze({ valid: false, minutes: null });
  }
  const raw = ((bytes[5] ?? 0xff) << 8) | (bytes[6] ?? 0xff);
  if (raw > 64255) return Object.freeze({ valid: false, minutes: null, raw });
  return Object.freeze({ valid: true, minutes: raw, raw });
}

export function describeRhmiStatus(statusCode) {
  switch (statusCode) {
    case 0x00: return "closed-open-possible";
    case 0x01: return "user-decision-pending";
    case 0x10: return "open";
    case 0x20: return "user-rejected";
    case 0x21: return "local-hmi-in-use";
    case 0x2f: return "conditions-not-met";
    default: return "unknown";
  }
}
