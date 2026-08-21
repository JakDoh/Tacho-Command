import {
  DDP_REQUEST_DRIVER_CARD_SLOT_1,
  DDP_REQUEST_OVERVIEW_GEN2,
  DDP_REQUEST_TRANSFER_EXIT,
  DDP_REQUEST_UPLOAD,
  DDP_START_COMMUNICATION_REQUEST,
  DDP_START_DIAGNOSTIC_SESSION_REQUEST,
  DDP_STOP_COMMUNICATION_REQUEST,
  createDdpTransferAssembler,
  parseDdpMessage,
  pushDdpSubMessage,
} from "./tacho-download.js";

const DEFAULTS = Object.freeze({ p2Ms: 6000, pendingMs: 30000, p3Ms: 60, maxAttempts: 3, maxPending: 20 });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class DdpRunnerError extends Error {
  constructor(code, phase, detail = null) {
    super(`${phase}: ${code}${detail === null ? "" : ` (${detail})`}`);
    this.name = "DdpRunnerError";
    this.code = code;
    this.phase = phase;
    this.detail = detail;
  }
}

async function receiveExpected(transport, requestSid, positiveSid, phase, options) {
  let pendingCount = 0;
  while (true) {
    const message = await transport.receive(options.p2Ms);
    if (!message) throw new DdpRunnerError("timeout", phase);
    const parsed = parseDdpMessage(message);
    if (!parsed.valid) throw new DdpRunnerError("invalid-response", phase, parsed.reason);
    if (parsed.sid === 0x7f && parsed.data[1] === requestSid) {
      const nrc = parsed.data[2] ?? null;
      if (nrc === 0x78) {
        pendingCount += 1;
        if (pendingCount > options.maxPending) throw new DdpRunnerError("response-pending-limit", phase);
        const pending = await transport.receive(options.pendingMs);
        if (!pending) throw new DdpRunnerError("response-pending-timeout", phase);
        const pendingParsed = parseDdpMessage(pending);
        if (!pendingParsed.valid) throw new DdpRunnerError("invalid-response", phase, pendingParsed.reason);
        if (pendingParsed.sid === 0x7f && pendingParsed.data[1] === requestSid && pendingParsed.data[2] === 0x78) continue;
        if (pendingParsed.sid === 0x7f && pendingParsed.data[1] === requestSid) {
          throw new DdpRunnerError("negative-response", phase, pendingParsed.data[2] ?? null);
        }
        if (pendingParsed.sid !== positiveSid) throw new DdpRunnerError("unexpected-response", phase, pendingParsed.sid);
        return pendingParsed;
      }
      throw new DdpRunnerError("negative-response", phase, nrc);
    }
    if (parsed.sid !== positiveSid) throw new DdpRunnerError("unexpected-response", phase, parsed.sid);
    return parsed;
  }
}

async function exchange(transport, request, requestSid, positiveSid, phase, options) {
  let lastError = null;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (attempt > 1) await wait(options.p3Ms);
    await transport.send(request);
    try {
      return await receiveExpected(transport, requestSid, positiveSid, phase, options);
    } catch (error) {
      lastError = error;
      if (error instanceof DdpRunnerError && error.code === "negative-response") throw error;
    }
  }
  throw lastError ?? new DdpRunnerError("exchange-failed", phase);
}

async function transfer(transport, request, trep, phase, options) {
  await transport.send(request);
  const assembler = createDdpTransferAssembler(trep);
  let retries = 0;
  let lastAck = null;
  let pendingCount = 0;
  while (true) {
    const message = await transport.receive(retries === 0 ? options.p2Ms : options.pendingMs);
    if (!message) {
      retries += 1;
      if (retries >= options.maxAttempts) throw new DdpRunnerError("timeout", phase);
      await wait(options.p3Ms);
      await transport.send(lastAck ?? request);
      continue;
    }
    const parsed = parseDdpMessage(message);
    if (parsed.valid && parsed.sid === 0x7f && parsed.data[1] === 0x36 && parsed.data[2] === 0x78) {
      pendingCount += 1;
      if (pendingCount > options.maxPending) throw new DdpRunnerError("response-pending-limit", phase);
      continue;
    }
    if (parsed.valid && parsed.sid === 0x7f && parsed.data[1] === 0x36) {
      throw new DdpRunnerError("negative-response", phase, parsed.data[2] ?? null);
    }
    pendingCount = 0;
    const result = pushDdpSubMessage(assembler, message);
    if (!result.ack) throw new DdpRunnerError("invalid-sub-message", phase, result.reason);
    lastAck = result.ack;
    await transport.send(lastAck);
    if (result.status === "complete") return result.payload;
    if (result.status === "retry") {
      retries += 1;
      if (retries >= options.maxAttempts) throw new DdpRunnerError("sub-message-retry-limit", phase, result.reason);
    } else {
      retries = 0;
    }
  }
}

async function bestEffortClose(transport, uploadStarted, options) {
  let transferExitConfirmed = false;
  let stopConfirmed = false;
  if (uploadStarted) {
    try {
      await exchange(transport, DDP_REQUEST_TRANSFER_EXIT, 0x37, 0x77, "request-transfer-exit", options);
      transferExitConfirmed = true;
    } catch {}
  }
  try {
    await exchange(transport, DDP_STOP_COMMUNICATION_REQUEST, 0x82, 0xc2, "stop-communication", options);
    stopConfirmed = true;
  } catch {}
  return Object.freeze({ transferExitConfirmed, stopConfirmed });
}

export async function runDdpCardDownload(transport, inputOptions = {}) {
  const options = Object.freeze({ ...DEFAULTS, ...inputOptions });
  let opened = false;
  let uploadStarted = false;
  let closeAttempted = false;
  let lastTeardown = null;
  try {
    await exchange(transport, DDP_START_COMMUNICATION_REQUEST, 0x81, 0xc1, "start-communication", options);
    opened = true;
    await exchange(transport, DDP_START_DIAGNOSTIC_SESSION_REQUEST, 0x10, 0x50, "start-diagnostic-session", options);
    await exchange(transport, DDP_REQUEST_UPLOAD, 0x35, 0x75, "request-upload", options);
    uploadStarted = true;
    await transfer(transport, DDP_REQUEST_OVERVIEW_GEN2, 0x21, "overview", options);
    const cardData = await transfer(transport, DDP_REQUEST_DRIVER_CARD_SLOT_1, 0x06, "driver-card-slot-1", options);
    if (!cardData?.length) throw new DdpRunnerError("empty-card-download", "driver-card-slot-1");
    closeAttempted = true;
    const teardown = await bestEffortClose(transport, true, options);
    lastTeardown = teardown;
    if (!teardown.transferExitConfirmed || !teardown.stopConfirmed) {
      throw new DdpRunnerError("close-not-confirmed", "teardown");
    }
    return Object.freeze({ status: "complete", cardData, teardown, failure: null });
  } catch (error) {
    const teardown = closeAttempted
      ? lastTeardown
      : opened
        ? await bestEffortClose(transport, uploadStarted, options)
        : Object.freeze({ transferExitConfirmed: false, stopConfirmed: false });
    return Object.freeze({
      status: "failed",
      cardData: null,
      teardown,
      failure: Object.freeze({
        code: error instanceof DdpRunnerError ? error.code : "transport-error",
        phase: error instanceof DdpRunnerError ? error.phase : "unknown",
        detail: error instanceof DdpRunnerError ? error.detail : null,
      }),
    });
  } finally {
    await transport.disconnect();
  }
}

export { DdpRunnerError };
