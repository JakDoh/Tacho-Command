import {
  DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION,
  DDP_REQUEST_DRIVER_CARD_SLOT_1,
  DDP_REQUEST_GEN2V2_OVERVIEW,
  DDP_REQUEST_TRANSFER_EXIT,
  DDP_REQUEST_UPLOAD,
  DDP_START_COMMUNICATION_REQUEST,
  DDP_START_DIAGNOSTIC_SESSION_REQUEST,
  DDP_STOP_COMMUNICATION_REQUEST,
  createDdpTransferAssembler,
  parseDdpMessage,
  pushDdpSubMessage,
} from "./tacho-download.js";

const DEFAULTS = Object.freeze({
  p2Ms: 6000,
  pendingMs: 30000,
  p3Ms: 60,
  maxAttempts: 3,
  maxPending: 40,
  cardTimeoutMs: 1200000, // až 20 minut pro stahování karty řidiče
  slot: 1, // výchozí Slot 1 (řidič)
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checksum = (bytes) => bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);
const withChecksum = (bytes) => Object.freeze([...bytes, checksum(bytes)]);

class DdpRunnerError extends Error {
  constructor(code, phase, detail = null) {
    super(`${phase}: ${code}${detail === null ? "" : ` (${detail})`}`);
    this.name = "DdpRunnerError";
    this.code = code;
    this.phase = phase;
    this.detail = detail;
  }
}

function validateResponseParameters(phase, parsed) {
  if (!parsed.data || parsed.data.length < 1) return false;
  if (phase === "start-communication") {
    return parsed.data.length >= 3 && parsed.data[1] === 0xea && parsed.data[2] === 0x8f;
  }
  if (phase === "start-diagnostic-session") {
    return parsed.data.length >= 2 && parsed.data[1] === 0x81;
  }
  if (phase === "request-upload") {
    return parsed.data.length >= 3 && parsed.data[1] === 0x00 && parsed.data[2] === 0xff;
  }
  return true;
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
        if (!validateResponseParameters(phase, pendingParsed)) {
          throw new DdpRunnerError("invalid-response-parameters", phase);
        }
        return pendingParsed;
      }
      throw new DdpRunnerError("negative-response", phase, nrc);
    }
    if (parsed.sid !== positiveSid) throw new DdpRunnerError("unexpected-response", phase, parsed.sid);
    if (!validateResponseParameters(phase, parsed)) {
      throw new DdpRunnerError("invalid-response-parameters", phase);
    }
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
      if (error instanceof DdpRunnerError && (error.code === "negative-response" || error.code === "invalid-response-parameters")) {
        throw error;
      }
    }
  }
  throw lastError ?? new DdpRunnerError("exchange-failed", phase);
}

async function transfer(transport, request, trep, phase, options, onSubProgress = null) {
  await transport.send(request);
  const assembler = createDdpTransferAssembler(trep);
  let retries = 0;
  let lastAck = null;
  let pendingCount = 0;
  const isCardSlot = phase.startsWith("driver-card");
  const initialTimeoutMs = isCardSlot ? options.cardTimeoutMs : options.p2Ms;

  while (true) {
    const timeoutMs = lastAck === null ? initialTimeoutMs : options.pendingMs;
    const message = await transport.receive(timeoutMs);
    if (!message) {
      if (lastAck === null && isCardSlot) {
        // Nikdy neopakovat naslepo úvodní požadavek na čtení karty po vypršení timeoutu
        throw new DdpRunnerError("timeout", phase);
      }
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

    if (onSubProgress) {
      const bytesTransferred = assembler.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      onSubProgress({
        phase,
        blockIndex: assembler.expectedCounter - 1,
        bytesTransferred,
        complete: result.status === "complete",
      });
    }

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

export async function runDdpCardDownload(transport, inputOptions = {}, onProgressCallback = null) {
  const options = Object.freeze({ ...DEFAULTS, ...inputOptions });
  const progressHandler =
    typeof onProgressCallback === "function"
      ? onProgressCallback
      : typeof inputOptions?.onProgress === "function"
        ? inputOptions.onProgress
        : null;

  const notifyProgress = (phase, percent, detail = "", extra = {}) => {
    if (progressHandler) {
      progressHandler({ phase, percent, detail, ...extra });
    }
  };

  let opened = false;
  let uploadStarted = false;
  let closeAttempted = false;
  let lastTeardown = null;

  try {
    notifyProgress("start-communication", 5, "Zahajuji komunikaci (StartCommunication)");
    await exchange(transport, DDP_START_COMMUNICATION_REQUEST, 0x81, 0xc1, "start-communication", options);
    opened = true;

    notifyProgress("start-diagnostic-session", 10, "Aktivuji diagnostickou relaci (DiagnosticSession)");
    await exchange(transport, DDP_START_DIAGNOSTIC_SESSION_REQUEST, 0x10, 0x50, "start-diagnostic-session", options);

    notifyProgress("request-upload", 15, "Požadavek na přenos dat (RequestUpload)");
    await exchange(transport, DDP_REQUEST_UPLOAD, 0x35, 0x75, "request-upload", options);
    uploadStarted = true;

    notifyProgress("download-interface-version", 20, "Ověřuji verzi DDP rozhraní");
    const versionPayload = await transfer(
      transport,
      DDP_REQUEST_DOWNLOAD_INTERFACE_VERSION,
      0x00,
      "download-interface-version",
      options,
    );

    if (!versionPayload || versionPayload.length < 2 || versionPayload[0] !== 0x02 || versionPayload[1] !== 0x02) {
      throw new DdpRunnerError(
        "unsupported-interface-version",
        "download-interface-version",
        versionPayload ? Array.from(versionPayload).map((b) => b.toString(16).padStart(2, "0")).join(" ") : "empty",
      );
    }

    notifyProgress("gen2v2-overview", 25, "Stahuji přehled Smart Tacho 2 (Overview)");
    await transfer(transport, DDP_REQUEST_GEN2V2_OVERVIEW, 0x31, "gen2v2-overview", options);

    const slotNumber = options.slot === 2 ? 2 : 1;
    const cardRequest =
      slotNumber === 2
        ? withChecksum([0x80, 0xee, 0xf0, 0x03, 0x36, 0x06, 0x02])
        : DDP_REQUEST_DRIVER_CARD_SLOT_1;

    const phaseName = slotNumber === 2 ? "driver-card-slot-2" : "driver-card-slot-1";
    notifyProgress(phaseName, 30, `Stahuji data karty řidiče (Slot ${slotNumber})`);

    const cardData = await transfer(
      transport,
      cardRequest,
      0x06,
      phaseName,
      options,
      (sub) => {
        // Průměrná karta má cca 28-35 KB dat, dynamicky přepočítáme na 30-95 %
        const estimatedBytes = 32768;
        const progressInCard = Math.min(65, Math.floor((sub.bytesTransferred / estimatedBytes) * 65));
        const currentPercent = Math.min(95, 30 + progressInCard);
        notifyProgress(
          phaseName,
          currentPercent,
          `Přenášení: ${(sub.bytesTransferred / 1024).toFixed(1)} KB (blok ${sub.blockIndex})`,
          { bytesTransferred: sub.bytesTransferred, blockIndex: sub.blockIndex },
        );
      },
    );

    if (!cardData?.length) throw new DdpRunnerError("empty-card-download", phaseName);

    notifyProgress("teardown", 96, "Ukončuji přenos dat (TransferExit & StopCommunication)");
    closeAttempted = true;
    const teardown = await bestEffortClose(transport, true, options);
    lastTeardown = teardown;

    if (!teardown.transferExitConfirmed || !teardown.stopConfirmed) {
      throw new DdpRunnerError("close-not-confirmed", "teardown");
    }

    notifyProgress("complete", 100, "Stahování karty úspěšně dokončeno", {
      totalBytes: cardData.length,
    });

    return Object.freeze({ status: "complete", cardData, teardown, failure: null });
  } catch (error) {
    const teardown = closeAttempted
      ? lastTeardown
      : opened
        ? await bestEffortClose(transport, uploadStarted, options)
        : Object.freeze({ transferExitConfirmed: false, stopConfirmed: false });

    notifyProgress("failed", 0, error instanceof Error ? error.message : "Chyba přenosu");

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
