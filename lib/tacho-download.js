const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);

const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

export const DDP_START_COMMUNICATION_REQUEST = withChecksum([0x81, 0xee, 0xf0, 0x81]);
export const DDP_START_DIAGNOSTIC_SESSION_REQUEST = withChecksum([0x80, 0xee, 0xf0, 0x02, 0x10, 0x81]);
export const DDP_STOP_COMMUNICATION_REQUEST = withChecksum([0x80, 0xee, 0xf0, 0x01, 0x82]);

export function classifyDdpPacket(packet, requestSid) {
  const bytes = Array.from(packet ?? []);
  const framed = bytes[0] === 1 && bytes[1] === 1;
  const message = framed ? bytes.slice(2) : [];
  const checksumValid = message.length > 1 && checksum(message.slice(0, -1)) === message.at(-1);
  const addressedToClient = message[1] === 0xf0 && message[2] === 0xee;
  const sid = message[4] ?? null;
  const negative = addressedToClient && checksumValid && sid === 0x7f && message[5] === requestSid;
  return Object.freeze({
    framed,
    checksumValid,
    sid,
    positive: addressedToClient && checksumValid && sid === ((requestSid + 0x40) & 0xff),
    negative,
    negativeResponseCode: negative ? message[6] ?? null : null,
  });
}
