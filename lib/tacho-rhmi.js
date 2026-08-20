export const OPEN_RHMI_ROUTINE_ID = 0xf211;

export function buildOpenRhmiStartRequest() {
  return Object.freeze([0x31, 0x01, 0xf2, 0x11]);
}

export function buildOpenRhmiStatusRequest() {
  return Object.freeze([0x31, 0x03, 0xf2, 0x11]);
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
