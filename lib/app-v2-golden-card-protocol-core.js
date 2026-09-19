const checksum = (bytes) => bytes.reduce((sum, value) => (sum + value) & 0xff, 0);
const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

export const APP_V2_GOLDEN_CARD_COMMANDS = Object.freeze({
  startCommunication: withChecksum([0x81, 0xee, 0xf0, 0x81]),
  startDiagnosticSession: withChecksum([0x80, 0xee, 0xf0, 0x02, 0x10, 0x81]),
  requestUpload: withChecksum([0x80, 0xee, 0xf0, 0x0a, 0x35, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]),
  cardSlot1: withChecksum([0x80, 0xee, 0xf0, 0x03, 0x36, 0x06, 0x01]),
  transferExit: withChecksum([0x80, 0xee, 0xf0, 0x01, 0x37]),
  stopCommunication: withChecksum([0x80, 0xee, 0xf0, 0x01, 0x82]),
});

const POSITIVE_SID = Object.freeze({
  0x81: 0xc1,
  0x10: 0x50,
  0x35: 0x75,
  0x36: 0x76,
  0x37: 0x77,
  0x82: 0xc2,
});

export function buildAppV2GoldenAck(counter) {
  if (!Number.isInteger(counter) || counter < 0 || counter > 0xffff) {
    throw new RangeError("ACK counter must fit uint16");
  }
  return withChecksum([0x80, 0xee, 0xf0, 0x04, 0x83, 0x76, (counter >> 8) & 0xff, counter & 0xff]);
}

export function parseAppV2GoldenDdp(message) {
  const bytes = Array.from(message ?? []);
  if (bytes.length < 6) return Object.freeze({ valid: false, reason: "short-message", data: Object.freeze([]) });

  const length = bytes[3];
  if (bytes.length !== 4 + length + 1) {
    return Object.freeze({ valid: false, reason: "length-mismatch", data: Object.freeze([]) });
  }

  if (checksum(bytes.slice(0, -1)) !== bytes.at(-1)) {
    return Object.freeze({ valid: false, reason: "checksum", data: Object.freeze([]) });
  }

  if (bytes[1] !== 0xf0 || bytes[2] !== 0xee) {
    return Object.freeze({ valid: false, reason: "address", data: Object.freeze([]) });
  }

  const data = Object.freeze(bytes.slice(4, 4 + length));
  return Object.freeze({
    valid: true,
    reason: null,
    sid: data[0] ?? null,
    data,
  });
}

export function classifyAppV2GoldenResponse(message, requestSid, trep = null) {
  const parsed = parseAppV2GoldenDdp(message);
  if (!parsed.valid) {
    return Object.freeze({ valid: false, reason: parsed.reason, matches: false });
  }

  const negative = parsed.sid === 0x7f && parsed.data[1] === requestSid;
  const nrc = negative ? (parsed.data[2] ?? null) : null;
  const responseTrep = parsed.sid === 0x76 ? (parsed.data[1] ?? null) : null;
  const positiveSid = POSITIVE_SID[requestSid] ?? ((requestSid + 0x40) & 0xff);
  const positive = parsed.sid === positiveSid && (trep === null || responseTrep === trep);

  return Object.freeze({
    valid: true,
    matches: positive || negative,
    positive,
    negative,
    responsePending: negative && nrc === 0x78,
    nrc,
    trep: responseTrep,
    parsed,
  });
}

export function createAppV2GoldenCardAssembler() {
  let multipart = false;
  let expectedCounter = 1;
  let submessages = 0;
  let total = 0;
  const chunks = [];
  let done = false;

  return Object.freeze({
    push(message) {
      if (done) return Object.freeze({ status: "error", reason: "already-complete" });

      const parsed = parseAppV2GoldenDdp(message);
      if (!parsed.valid) return Object.freeze({ status: "error", reason: "ddp-" + parsed.reason });

      if (parsed.sid === 0x7f && parsed.data[1] === 0x36) {
        const nrc = parsed.data[2] ?? null;
        if (nrc === 0x78) return Object.freeze({ status: "pending" });
        return Object.freeze({ status: "error", reason: "nrc-" + String(nrc ?? "unknown") });
      }

      if (parsed.sid !== 0x76 || parsed.data[1] !== 0x06) {
        return Object.freeze({ status: "ignored" });
      }

      const dataLength = Array.from(message)[3] ?? 0;
      if (!multipart && dataLength < 0xff) {
        const payload = Uint8Array.from(parsed.data.slice(2));
        chunks.push(payload);
        total += payload.length;
        submessages = 1;
        done = true;
        return Object.freeze({ status: "complete", submessages, total, payload: merge(chunks, total) });
      }

      if (parsed.data.length < 4) {
        return Object.freeze({ status: "error", reason: "missing-counter" });
      }

      multipart = true;
      const counter = ((parsed.data[2] ?? 0) << 8) | (parsed.data[3] ?? 0);
      if (counter !== expectedCounter) {
        return Object.freeze({ status: "error", reason: "counter-mismatch", expectedCounter, counter });
      }

      const payload = Uint8Array.from(parsed.data.slice(4));
      chunks.push(payload);
      total += payload.length;
      submessages += 1;

      if (dataLength < 0xff) {
        done = true;
        return Object.freeze({ status: "complete", submessages, total, payload: merge(chunks, total) });
      }

      if (counter === 0xffff) {
        return Object.freeze({ status: "error", reason: "counter-overflow" });
      }

      expectedCounter = counter + 1;
      return Object.freeze({
        status: "continue",
        submessages,
        total,
        nextAck: buildAppV2GoldenAck(expectedCounter),
      });
    },
  });
}

function merge(chunks, total) {
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

export function validateAppV2GoldenCardTlv(payload) {
  const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload ?? []);
  let offset = 0;
  let count = 0;

  while (offset < bytes.length) {
    if (bytes.length - offset < 5) return Object.freeze({ valid: false, count, reason: "truncated-header" });
    const length = (bytes[offset + 3] << 8) | bytes[offset + 4];
    if (length === 0xffff) return Object.freeze({ valid: false, count, reason: "reserved-length-ffff" });
    if (offset + 5 + length > bytes.length) {
      return Object.freeze({ valid: false, count, reason: "truncated-value" });
    }
    count += 1;
    offset += 5 + length;
    if (count > 5000) return Object.freeze({ valid: false, count, reason: "too-many-objects" });
  }

  return Object.freeze({
    valid: offset === bytes.length,
    count,
    reason: offset === bytes.length ? null : "length",
  });
}
