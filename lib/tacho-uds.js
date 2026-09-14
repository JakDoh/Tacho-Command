import { createItsMessageAssembler, pushItsPacket } from "./tacho-download.js";

const toBytes = (value) => Array.from(value ?? [], (byte) => Number(byte) & 0xff);

export function udsResponseMatchesRequest(requestBytes = [], responseBytes = []) {
  const request = toBytes(requestBytes);
  const response = toBytes(responseBytes);
  const requestSid = request[0];
  if (requestSid === undefined || response.length === 0) return false;

  if (response[0] === 0x7f) return response[1] === requestSid;

  if (requestSid === 0x22) {
    return response[0] === 0x62
      && response[1] === request[1]
      && response[2] === request[2];
  }

  if (requestSid === 0x31) {
    return response[0] === 0x71
      && response[1] === request[1]
      && response[2] === request[2]
      && response[3] === request[3];
  }

  if (requestSid === 0x3e) {
    return response[0] === 0x7e && response[1] === request[1];
  }

  if (requestSid === 0x10) {
    return response[0] === 0x50 && response[1] === request[1];
  }

  return response[0] === ((requestSid + 0x40) & 0xff);
}

export function createUdsResponseCollector(requestBytes = []) {
  const request = Object.freeze(toBytes(requestBytes));
  const assembler = createItsMessageAssembler();
  let settled = false;

  return Object.freeze({
    push(packet) {
      if (settled) {
        return Object.freeze({ status: "ignored", reason: "already-complete", response: null });
      }

      const part = pushItsPacket(assembler, packet);
      if (part.status === "invalid") {
        return Object.freeze({ status: "invalid", reason: part.reason, response: null });
      }
      if (part.status === "pending") {
        return Object.freeze({ status: "pending", reason: null, response: null });
      }
      if (!udsResponseMatchesRequest(request, part.message)) {
        return Object.freeze({ status: "unmatched", reason: "response-does-not-match-request", response: null });
      }

      settled = true;
      return Object.freeze({
        status: "complete",
        reason: null,
        response: Object.freeze([1, 1, ...part.message]),
      });
    },
  });
}
