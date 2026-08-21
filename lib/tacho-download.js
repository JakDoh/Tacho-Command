const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);

const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

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
