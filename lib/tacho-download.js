const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);

const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

export function createItsMessageAssembler() {
  return { expectedPackets: 0, nextPacket: 1, chunks: [] };
}

export function pushItsPacket(assembler, packet) {
  const bytes = Array.from(packet ?? []);
  if (bytes.length < 2) return Object.freeze({ status: "invalid", reason: "short-packet", message: null });
  const total = bytes[0];
  const sequence = bytes[1];
  if (sequence === 1) {
    if (total < 1) return Object.freeze({ status: "invalid", reason: "invalid-total", message: null });
    assembler.expectedPackets = total;
    assembler.nextPacket = 2;
    assembler.chunks = [bytes.slice(2)];
  } else {
    if (total !== 0 || assembler.expectedPackets < 2 || sequence !== assembler.nextPacket) {
      assembler.expectedPackets = 0;
      assembler.nextPacket = 1;
      assembler.chunks = [];
      return Object.freeze({ status: "invalid", reason: "out-of-order", message: null });
    }
    assembler.chunks.push(bytes.slice(2));
    assembler.nextPacket += 1;
  }
  if (sequence < assembler.expectedPackets) return Object.freeze({ status: "pending", reason: null, message: null });
  const message = assembler.chunks.flat();
  assembler.expectedPackets = 0;
  assembler.nextPacket = 1;
  assembler.chunks = [];
  return Object.freeze({ status: "complete", reason: null, message: Object.freeze(message) });
}

export function parseDdpMessage(message) {
  const bytes = Array.from(message ?? []);
  if (bytes.length < 6) return Object.freeze({ valid: false, reason: "short-message", sid: null, data: Object.freeze([]) });
  const dataLength = bytes[3];
  const expectedLength = 4 + dataLength + 1;
  if (bytes.length !== expectedLength) return Object.freeze({ valid: false, reason: "length-mismatch", sid: null, data: Object.freeze([]) });
  if (checksum(bytes.slice(0, -1)) !== bytes.at(-1)) return Object.freeze({ valid: false, reason: "checksum", sid: null, data: Object.freeze([]) });
  if (bytes[1] !== 0xf0 || bytes[2] !== 0xee) return Object.freeze({ valid: false, reason: "address", sid: null, data: Object.freeze([]) });
  const data = Object.freeze(bytes.slice(4, 4 + dataLength));
  return Object.freeze({ valid: true, reason: null, sid: data[0] ?? null, data });
}

export const DDP_START_COMMUNICATION_REQUEST = withChecksum([0x81, 0xee, 0xf0, 0x81]);
export const DDP_START_DIAGNOSTIC_SESSION_REQUEST = withChecksum([0x80, 0xee, 0xf0, 0x02, 0x10, 0x81]);
export const DDP_REQUEST_UPLOAD = withChecksum([0x80, 0xee, 0xf0, 0x0a, 0x35, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
export const DDP_REQUEST_OVERVIEW = withChecksum([0x80, 0xee, 0xf0, 0x02, 0x36, 0x01]);
export const DDP_REQUEST_DRIVER_CARD_SLOT_1 = withChecksum([0x80, 0xee, 0xf0, 0x03, 0x36, 0x06, 0x01]);
export const DDP_REQUEST_TRANSFER_EXIT = withChecksum([0x80, 0xee, 0xf0, 0x01, 0x37]);
export const DDP_STOP_COMMUNICATION_REQUEST = withChecksum([0x80, 0xee, 0xf0, 0x01, 0x82]);

export const DDP_PHASES = Object.freeze([
  Object.freeze({ name: "start-communication", requestSid: 0x81, positiveSid: 0xc1, message: DDP_START_COMMUNICATION_REQUEST }),
  Object.freeze({ name: "start-diagnostic-session", requestSid: 0x10, positiveSid: 0x50, message: DDP_START_DIAGNOSTIC_SESSION_REQUEST }),
  Object.freeze({ name: "request-upload", requestSid: 0x35, positiveSid: 0x75, message: DDP_REQUEST_UPLOAD }),
  Object.freeze({ name: "request-overview", requestSid: 0x36, positiveSid: 0x76, trep: 0x01, message: DDP_REQUEST_OVERVIEW }),
  Object.freeze({ name: "request-driver-card-slot-1", requestSid: 0x36, positiveSid: 0x76, trep: 0x06, message: DDP_REQUEST_DRIVER_CARD_SLOT_1 }),
  Object.freeze({ name: "request-transfer-exit", requestSid: 0x37, positiveSid: 0x77, message: DDP_REQUEST_TRANSFER_EXIT }),
  Object.freeze({ name: "stop-communication", requestSid: 0x82, positiveSid: 0xc2, message: DDP_STOP_COMMUNICATION_REQUEST }),
]);

export function createDdpSession() {
  return Object.freeze({ phaseIndex: 0, status: "running", failure: null });
}

export function advanceDdpSession(session, event) {
  if (session.status !== "running") return session;
  const phase = DDP_PHASES[session.phaseIndex];
  if (!phase) return Object.freeze({ ...session, status: "complete" });
  if (event.type === "positive" && event.sid === phase.positiveSid && (phase.trep === undefined || event.trep === phase.trep)) {
    const phaseIndex = session.phaseIndex + 1;
    return Object.freeze({ phaseIndex, status: phaseIndex === DDP_PHASES.length ? "complete" : "running", failure: null });
  }
  if (event.type === "response-pending" && event.requestSid === phase.requestSid) return session;
  if (event.type === "negative" || event.type === "timeout" || event.type === "transport-error") {
    return Object.freeze({ ...session, status: "teardown-required", failure: Object.freeze({ phase: phase.name, type: event.type, code: event.code ?? null }) });
  }
  return session;
}

export function getDdpTeardownMessages(session) {
  if (session.status !== "teardown-required") return Object.freeze([]);
  const opened = session.phaseIndex > 0;
  const uploadStarted = session.phaseIndex > 2;
  return Object.freeze([
    ...(uploadStarted ? [DDP_REQUEST_TRANSFER_EXIT] : []),
    ...(opened ? [DDP_STOP_COMMUNICATION_REQUEST] : []),
  ]);
}

export function classifyDdpPacket(packet, requestSid) {
  const bytes = Array.from(packet ?? []);
  const framed = bytes[0] === 1 && bytes[1] === 1;
  const message = framed ? bytes.slice(2) : [];
  const parsed = parseDdpMessage(message);
  const checksumValid = parsed.valid;
  const sid = parsed.sid;
  const negative = parsed.valid && sid === 0x7f && parsed.data[1] === requestSid;
  return Object.freeze({
    framed,
    checksumValid,
    sid,
    positive: parsed.valid && sid === ((requestSid + 0x40) & 0xff),
    negative,
    negativeResponseCode: negative ? parsed.data[2] ?? null : null,
  });
}
