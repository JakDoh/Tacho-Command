export const OPEN_RHMI_ROUTINE_ID = 0xf211;

export const RHMI_DIDS = Object.freeze({
  DRIVER_1_WORKING_STATE: 0xf903,
  DRIVER_1_CUMULATIVE_BREAK: 0xf90b,
  DRIVER_1_CURRENT_DAILY_DRIVING: 0xf90c,
  DRIVER_1_CURRENT_WEEKLY_DRIVING: 0xf90d,
  TACHOGRAPH_VEHICLE_SPEED: 0xf904,
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
  // Expected response format: [1, 1, 0x62, 0xF9, 0x03, activityByte, timeHigh, timeLow, ...]
  if (bytes.length < 6 || bytes[0] !== 1 || bytes[1] !== 1 || bytes[2] !== 0x62) {
    return Object.freeze({ valid: false, activity: "unknown", continuousDrivingSeconds: 0 });
  }
  const activityByte = bytes[5] ?? 0xff;
  const stateCode = activityByte & 0x07;
  const activity = stateCode === 0 ? "rest" : stateCode === 1 ? "available" : stateCode === 2 ? "work" : stateCode === 3 ? "drive" : "unknown";
  
  // Continuous driving time (minutes or seconds depending on VU encoding, typically 2 bytes in minutes)
  let continuousDrivingMinutes = 0;
  if (bytes.length >= 8) {
    continuousDrivingMinutes = ((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0);
    if (continuousDrivingMinutes >= 0xff00) continuousDrivingMinutes = 0;
  }

  return Object.freeze({
    valid: true,
    activity,
    activityCode: stateCode,
    continuousDrivingMinutes,
    continuousDrivingSeconds: continuousDrivingMinutes * 60,
  });
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
