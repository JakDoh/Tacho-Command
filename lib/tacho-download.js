const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);

const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

const toByte = (value) => Number.isInteger(value) && value >= 0 && value <= 0xff
  ? value
  : null;

export function createBleCreditLedger() {
  return { serverCredits: 0, clientCredits: 0, closed: false, failure: null };
}

export function receiveServerCredits(ledger, value) {
  const credit = toByte(value);
  if (credit === null || credit === 0) return Object.freeze({ accepted: false, reason: "invalid-credit" });
  if (credit === 0xff) {
    ledger.closed = true;
    ledger.failure = "peer-disconnect";
    return Object.freeze({ accepted: true, reason: "peer-disconnect" });
  }
  if (ledger.closed) return Object.freeze({ accepted: false, reason: "closed" });
  ledger.serverCredits += credit;
  return Object.freeze({ accepted: true, reason: null });
}

export function consumeServerCredit(ledger) {
  if (ledger.closed) return Object.freeze({ accepted: false, reason: "closed" });
  if (ledger.serverCredits < 1) return Object.freeze({ accepted: false, reason: "credit-exhausted" });
  ledger.serverCredits -= 1;
  return Object.freeze({ accepted: true, reason: null });
}

export function grantClientCredits(ledger, value) {
  const credit = toByte(value);
  if (ledger.closed) return Object.freeze({ accepted: false, reason: "closed" });
  if (credit === null || credit === 0 || credit === 0xff) {
    return Object.freeze({ accepted: false, reason: "invalid-credit" });
  }
  ledger.clientCredits += credit;
  return Object.freeze({ accepted: true, reason: null });
}

export function consumeClientCredit(ledger) {
  if (ledger.closed) return Object.freeze({ accepted: false, reason: "closed" });
  if (ledger.clientCredits < 1) {
    ledger.failure = "peer-exceeded-credit";
    return Object.freeze({ accepted: false, reason: "peer-exceeded-credit" });
  }
  ledger.clientCredits -= 1;
  return Object.freeze({ accepted: true, reason: null });
}

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

export function buildDdpSubMessageAck(counter) {
  if (!Number.isInteger(counter) || counter < 0 || counter > 0xffff) {
    throw new RangeError("DDP sub-message counter must be a 16-bit integer");
  }
  return withChecksum([0x80, 0xee, 0xf0, 0x04, 0x83, 0x76, (counter >>> 8) & 0xff, counter & 0xff]);
}

export const DDP_ABORT_SUB_MESSAGES = buildDdpSubMessageAck(0xffff);

export function createDdpTransferAssembler(trep) {
  const normalizedTrep = toByte(trep);
  if (normalizedTrep === null) throw new RangeError("TREP must be a byte");
  return { trep: normalizedTrep, expectedCounter: 1, chunks: [], complete: false };
}

export function pushDdpSubMessage(assembler, message) {
  if (assembler.complete) {
    return Object.freeze({ status: "invalid", reason: "already-complete", ack: null, payload: null });
  }
  const parsed = parseDdpMessage(message);
  const retry = () => buildDdpSubMessageAck(assembler.expectedCounter);
  if (!parsed.valid) {
    return Object.freeze({ status: "retry", reason: parsed.reason, ack: retry(), payload: null });
  }
  if (parsed.sid !== 0x76 || parsed.data.length < 4) {
    return Object.freeze({ status: "retry", reason: "not-transfer-data", ack: retry(), payload: null });
  }
  if (parsed.data[1] !== assembler.trep) {
    return Object.freeze({ status: "retry", reason: "trep-mismatch", ack: retry(), payload: null });
  }
  const counter = (parsed.data[2] << 8) | parsed.data[3];
  if (counter === ((assembler.expectedCounter - 1) & 0xffff)) {
    return Object.freeze({ status: "duplicate", reason: null, ack: retry(), payload: null });
  }
  if (counter !== assembler.expectedCounter || counter === 0xffff) {
    return Object.freeze({ status: "retry", reason: "counter-mismatch", ack: retry(), payload: null });
  }
  const payload = Object.freeze(parsed.data.slice(4));
  assembler.chunks.push(payload);
  assembler.expectedCounter += 1;
  const ack = buildDdpSubMessageAck(assembler.expectedCounter);
  if (parsed.data.length === 0xff) {
    return Object.freeze({ status: "pending", reason: null, ack, payload: null });
  }
  assembler.complete = true;
  return Object.freeze({ status: "complete", reason: null, ack, payload: Object.freeze(assembler.chunks.flat()) });
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
    if (phase.trep !== undefined && event.complete === false) return session;
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

export function createDdpTeardown(session) {
  const uploadStarted = session.phaseIndex > 2;
  return Object.freeze({
    phase: uploadStarted ? "request-transfer-exit" : "stop-communication",
    attempts: 0,
    status: "running",
    transferExitConfirmed: false,
    stopConfirmed: false,
  });
}

export function getDdpTeardownMessage(teardown) {
  if (teardown.status !== "running") return null;
  return teardown.phase === "request-transfer-exit"
    ? DDP_REQUEST_TRANSFER_EXIT
    : DDP_STOP_COMMUNICATION_REQUEST;
}

export function advanceDdpTeardown(teardown, event) {
  if (teardown.status !== "running") return teardown;
  const positiveSid = teardown.phase === "request-transfer-exit" ? 0x77 : 0xc2;
  if (event.type === "positive" && event.sid === positiveSid) {
    if (teardown.phase === "request-transfer-exit") {
      return Object.freeze({ ...teardown, phase: "stop-communication", attempts: 0, transferExitConfirmed: true });
    }
    return Object.freeze({ ...teardown, status: "complete", stopConfirmed: true });
  }
  if (event.type === "timeout" || event.type === "transport-error") {
    const attempts = teardown.attempts + 1;
    if (attempts < 3) return Object.freeze({ ...teardown, attempts });
    if (teardown.phase === "request-transfer-exit") {
      return Object.freeze({ ...teardown, phase: "stop-communication", attempts: 0 });
    }
    return Object.freeze({ ...teardown, attempts, status: "failed" });
  }
  return teardown;
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
    responsePending: negative && parsed.data[2] === 0x78,
    negativeResponseCode: negative ? parsed.data[2] ?? null : null,
  });
}
