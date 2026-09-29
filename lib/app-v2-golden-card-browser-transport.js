import {
  TACHO_DOWNLOAD_CREDITS_UUID,
  TACHO_DOWNLOAD_FIFO_UUID,
  TACHO_DOWNLOAD_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "./tacho-ble.js";
import {
  APP_V2_GOLDEN_CARD_COMMANDS,
  buildAppV2GoldenAck,
  classifyAppV2GoldenResponse,
  createAppV2GoldenCardAssembler,
  validateAppV2GoldenCardTlv,
} from "./app-v2-golden-card-protocol-core.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function selectAppV2GoldenCardDevice({ bluetooth } = {}) {
  if (!bluetooth || typeof bluetooth.requestDevice !== "function") {
    throw new Error("Web Bluetooth nije dostupan.");
  }

  // requestDevice must run while the button's transient user activation is
  // still valid. Awaiting LIVE teardown before this call can suppress the
  // Chrome chooser entirely.
  return bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS,
  });
}

function normalizeUuid(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function writeGatt(characteristic, bytes) {
  const value = Uint8Array.from(bytes);
  if (characteristic?.properties?.write && characteristic.writeValueWithResponse) {
    return characteristic.writeValueWithResponse(value);
  }
  if (characteristic?.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
    return characteristic.writeValueWithoutResponse(value);
  }
  if (characteristic?.writeValue) return characteristic.writeValue(value);
  if (characteristic?.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
  if (characteristic?.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
  throw new Error("Write metoda nije dostupna na karakteristici");
}

function createItsAssembler() {
  let expected = 0;
  let next = 1;
  let chunks = [];

  return Object.freeze({
    push(packet) {
      const bytes = Array.from(packet ?? []);
      if (bytes.length < 2) return Object.freeze({ status: "invalid", reason: "short-packet" });

      const total = bytes[0];
      const sequence = bytes[1];

      if (sequence === 1) {
        if (total < 1) return Object.freeze({ status: "invalid", reason: "invalid-total" });
        expected = total;
        next = 2;
        chunks = [bytes.slice(2)];
      } else {
        if (total !== 0 || expected < 2 || sequence !== next) {
          expected = 0;
          next = 1;
          chunks = [];
          return Object.freeze({ status: "invalid", reason: "out-of-order" });
        }
        chunks.push(bytes.slice(2));
        next += 1;
      }

      if (sequence < expected) return Object.freeze({ status: "pending" });

      const message = chunks.flat();
      expected = 0;
      next = 1;
      chunks = [];
      return Object.freeze({ status: "complete", message: Object.freeze(message) });
    },
  });
}

export async function readAppV2GoldenCardPayload({
  bluetooth,
  device: providedDevice = null,
  disconnectOnFinish = providedDevice === null,
  requestTimeoutMs = 7000,
  cardIdleTimeoutMs = 20 * 60 * 1000,
  firstPacketTimeoutMs = 90 * 1000,
  p3GuardMs = 100,
  onProgress,
  onDiagnostic,
  signal,
} = {}) {
  if (!providedDevice && (!bluetooth || typeof bluetooth.requestDevice !== "function")) {
    throw new Error("Web Bluetooth nije dostupan.");
  }

  const device = providedDevice ?? await selectAppV2GoldenCardDevice({ bluetooth });
  if (!device?.gatt) throw new Error("GATT interfejs nije dostupan");

  let credits = null;
  let fifo = null;
  let writeQueue = Promise.resolve();
  let closed = false;
  let peerClosed = false;
  let serverCredits = 0;
  let lastVuResponseAt = 0;
  let messageHandler = null;
  let abortCurrent = null;
  let communicationStarted = false;
  let uploadStarted = false;
  let cardTransferActive = false;
  const creditWaiters = [];
  const diagnosticStartedAt = performance.now();
  let stage = "connecting", lastConfirmedStage = "none", packets = 0, bytes = 0, pendingResponses = 0;
  const report = (next, confirmed = false, errorCode = null) => {
    stage = next;
    if (confirmed) lastConfirmedStage = next;
    try { onDiagnostic?.(Object.freeze({ stage, lastConfirmedStage, errorCode,
      elapsedMs: Math.round(performance.now() - diagnosticStartedAt),
      packets, bytes, pendingResponses, firstPacketTimeoutMs })); } catch {}
  };
  const diagnosticError = (error) => {
    const message = String(error?.message ?? "");
    if (signal?.aborted) return "cancelled";
    if (/FIRST_PACKET_TIMEOUT/.test(message)) return "first_packet_timeout";
    if (/credit timeout/i.test(message)) return "credits_timeout";
    if (/NRC/.test(message)) return message.match(/NRC 0x[0-9A-F]{2}/)?.[0] ?? "negative_response";
    if (/flow-control/.test(message)) return "peer_closed";
    if (/prekinut|zatvoren/.test(message)) return "disconnected";
    if (/TIMEOUT/.test(message)) return "response_timeout";
    return "transport_error";
  };


  const queueWrite = (characteristic, bytes) => {
    const operation = writeQueue.catch(() => {}).then(() => writeGatt(characteristic, bytes));
    writeQueue = operation.catch(() => {});
    return operation;
  };

  const rejectCreditWaiters = (error) => {
    while (creditWaiters.length) {
      const waiter = creditWaiters.shift();
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  };

  const abortRead = () => {
    peerClosed = true;
    rejectCreditWaiters(new Error("Bluetooth veza ili očitavanje je prekinuto"));
    abortCurrent?.();
    try { if (device.gatt.connected) device.gatt.disconnect?.(); } catch {}
  };
  const onDisconnected = () => abortRead();
  device.addEventListener?.("gattserverdisconnected", onDisconnected);
  signal?.addEventListener("abort", abortRead, { once: true });
  let onCredits = null;
  let onFifo = null;

  const releaseCredits = () => {
    while (serverCredits > 0 && creditWaiters.length) {
      const waiter = creditWaiters.shift();
      serverCredits -= 1;
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
  };

  const consumeServerCredit = async () => {
    if (peerClosed || signal?.aborted) throw new Error("Tahograf je zatvorio Download flow control");
    if (serverCredits > 0) {
      serverCredits -= 1;
      return;
    }

    await new Promise((resolve, reject) => {
      const waiter = { resolve, reject, timer: 0 };
      waiter.timer = setTimeout(() => {
        const index = creditWaiters.indexOf(waiter);
        if (index >= 0) creditWaiters.splice(index, 1);
        reject(new Error("Server credit timeout"));
      }, requestTimeoutMs);
      creditWaiters.push(waiter);
    });
  };

  const waitP3 = async () => {
    if (lastVuResponseAt <= 0) return;
    const remaining = p3GuardMs - (performance.now() - lastVuResponseAt);
    if (remaining > 0) await sleep(remaining);
  };

  const sendApp = async (message) => {
    if (closed || peerClosed || signal?.aborted) throw new Error("Card transport je zatvoren");
    await waitP3();
    await consumeServerCredit();
    await queueWrite(fifo, [1, 1, ...message]);
  };

  const sendSimple = (message, requestSid, trep = null, timeoutMs = requestTimeoutMs) => {
    if (messageHandler) return Promise.reject(new Error("Paralelni DDP zahtev nije dozvoljen"));

    return new Promise((resolve, reject) => {
      let done = false;
      let timer = 0;

      const cleanup = () => {
        clearTimeout(timer);
        if (messageHandler === handler) messageHandler = null;
        abortCurrent = null;
      };
      const finish = (value) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(value);
      };
      const fail = (error) => {
        if (done) return;
        done = true;
        cleanup();
        reject(error);
      };
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(null), timeoutMs);
      };

      const handler = (response) => {
        const classified = classifyAppV2GoldenResponse(response, requestSid, trep);
        if (!classified.valid) {
          fail(new Error("DDP invalid: " + String(classified.reason ?? "unknown")));
          return;
        }
        if (!classified.matches) return;

        lastVuResponseAt = performance.now();
        if (classified.responsePending) {
          arm();
          return;
        }
        finish(classified);
      };

      messageHandler = handler;
      abortCurrent = () => fail(new Error("Card transport prekinut"));
      arm();
      void sendApp(message).catch(fail);
    });
  };

  const requirePositive = (label, result, requestSid) => {
    if (!result) throw new Error(label + ": TIMEOUT");
    if (result.negative) {
      throw new Error(label + ": NRC 0x" + Number(result.nrc ?? 0).toString(16).padStart(2, "0").toUpperCase());
    }
    if (!result.positive) throw new Error(label + ": neočekivan odgovor");

    const data = result.parsed?.data ?? [];
    if (requestSid === 0x81 && !(data[0] === 0xc1 && data[1] === 0xea && data[2] === 0x8f)) {
      throw new Error("StartCommunication parametri nisu C1 EA 8F");
    }
    if (requestSid === 0x10 && !(data[0] === 0x50 && data[1] === 0x81)) {
      throw new Error("StartDiagnosticSession parametar nije 81");
    }
    if (requestSid === 0x35 && !(data[0] === 0x75 && data[1] === 0x00 && data[2] === 0xff)) {
      throw new Error("RequestUpload parametri nisu 75 00 FF");
    }
    return result;
  };

  try {
    if (signal?.aborted) throw new Error("Očitavanje je prekinuto");
    report("connecting");
    const server = await device.gatt.connect();
    report("connected", true);
    if (signal?.aborted || peerClosed) throw new Error("Očitavanje je prekinuto");
    report("discovering");
    const services = await server.getPrimaryServices();
    const download = services.find(
      (service) => normalizeUuid(service.uuid) === normalizeUuid(TACHO_DOWNLOAD_SERVICE_UUID),
    );
    if (!download) throw new Error("Smart Tacho Download servis nije pronađen");

    const characteristics = await download.getCharacteristics();
    fifo = characteristics.find(
      (characteristic) => normalizeUuid(characteristic.uuid) === normalizeUuid(TACHO_DOWNLOAD_FIFO_UUID),
    );
    credits = characteristics.find(
      (characteristic) => normalizeUuid(characteristic.uuid) === normalizeUuid(TACHO_DOWNLOAD_CREDITS_UUID),
    );
    if (!fifo || !credits) throw new Error("Download FIFO/Credits karakteristike nisu pronađene");

    const itsAssembler = createItsAssembler();

    credits.addEventListener("characteristicvaluechanged", onCredits = (event) => {
      const view = event?.target?.value;
      if (!view?.byteLength) return;
      const value = view.getUint8(0);

      if (value === 0xff) {
        peerClosed = true;
        const error = new Error("VU je zatvorio flow-control");
        rejectCreditWaiters(error);
        abortCurrent?.();
        return;
      }

      if (value === 0) return;
      serverCredits += value;
      releaseCredits();
    });

    fifo.addEventListener("characteristicvaluechanged", onFifo = (event) => {
      const view = event?.target?.value;
      if (!view?.byteLength) return;
      const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));

      void queueWrite(credits, [1]).catch(() => {});
      const assembled = itsAssembler.push(packet);
      if (assembled.status === "invalid") {
        abortCurrent?.();
        return;
      }
      if (assembled.status === "complete") {
        messageHandler?.(assembled.message);
      }
    });

    report("notifications");
    await credits.startNotifications();
    await fifo.startNotifications();
    await queueWrite(credits, [1]);
    report("notifications", true);
    report("start_communication");

    requirePositive(
      "DDP StartCommunication",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.startCommunication, 0x81),
      0x81,
    );
    communicationStarted = true;
    report("start_communication", true);
    report("start_session");

    requirePositive(
      "DDP StartDiagnosticSession 0x81",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.startDiagnosticSession, 0x10),
      0x10,
    );

    report("start_session", true);
    report("request_upload");
    requirePositive(
      "DDP RequestUpload",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.requestUpload, 0x35),
      0x35,
    );
    uploadStarted = true;
    report("request_upload", true);
    cardTransferActive = true;

    const transfer = await new Promise((resolve, reject) => {
      if (messageHandler) {
        reject(new Error("Paralelni DDP zahtev nije dozvoljen"));
        return;
      }

      const assembler = createAppV2GoldenCardAssembler();
      let done = false;
      let timer = 0;
      let firstPacketTimer = 0;

      const cleanup = () => {
        clearTimeout(timer);
        clearTimeout(firstPacketTimer);
        if (messageHandler === handler) messageHandler = null;
        abortCurrent = null;
      };
      const finish = (value) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(value);
      };
      const fail = (error) => {
        if (done) return;
        done = true;
        cleanup();
        reject(error);
      };
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(null), cardIdleTimeoutMs);
      };

      const handler = (response) => {
        const result = assembler.push(response);
        if (result.status === "ignored") return;
        lastVuResponseAt = performance.now();

        if (result.status === "continue" || result.status === "complete") {
          clearTimeout(firstPacketTimer);
          packets = result.submessages;
          bytes = result.total;
          report("receiving", true);
          try {
            onProgress?.(Object.freeze({
              submessages: result.submessages,
              byteLength: result.total,
              complete: result.status === "complete",
            }));
          } catch {}
        }

        if (result.status === "pending") {
          pendingResponses += 1;
          report(stage);
          arm();
          return;
        }
        if (result.status === "error") {
          fail(new Error("Card transfer: " + String(result.reason ?? "unknown")));
          return;
        }
        if (result.status === "complete") {
          finish(result);
          return;
        }
        if (result.status === "continue") {
          arm();
          void sendApp(result.nextAck).catch(fail);
        }
      };

      messageHandler = handler;
      abortCurrent = () => fail(new Error("Card transport prekinut"));
      report("waiting_first_packet");
      arm();
      // Absolute deadline: response-pending messages do not hide a zero-data stall.
      firstPacketTimer = setTimeout(() => fail(new Error("FIRST_PACKET_TIMEOUT")), firstPacketTimeoutMs);
      void sendApp(APP_V2_GOLDEN_CARD_COMMANDS.cardSlot1).catch(fail);
    });

    cardTransferActive = false;
    if (!transfer) throw new Error("Card Download TREP 06: TIMEOUT");

    report("transfer_received", true);
    const tlv = validateAppV2GoldenCardTlv(transfer.payload);
    if (!tlv.valid) {
      throw new Error("Card payload TLV validacija nije prošla: " + String(tlv.reason ?? "unknown"));
    }

    report("transfer_exit");
    requirePositive(
      "DDP RequestTransferExit",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.transferExit, 0x37),
      0x37,
    );
    uploadStarted = false;
    report("transfer_exit", true);
    report("stop_communication");

    requirePositive(
      "DDP StopCommunication",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.stopCommunication, 0x82),
      0x82,
    );
    communicationStarted = false;
    report("transport_complete", true);

    return Object.freeze({
      payload: transfer.payload,
      submessages: transfer.submessages,
      byteLength: transfer.total,
      tlvCount: tlv.count,
      transport: "golden-0.32c",
      fieldProven: true,
      fieldProofScope: "VDO-DTCO-4.1a-Android-Chrome-Slot1-2026-09-19",
    });
  } catch (error) {
    report(stage, false, diagnosticError(error));
    if (cardTransferActive && !peerClosed && fifo && credits) {
      try {
        await sendApp(buildAppV2GoldenAck(0xffff));
      } catch {}
      cardTransferActive = false;
    }

    if (!peerClosed && fifo && credits) {
      if (messageHandler) {
        try { abortCurrent?.(); } catch {}
        messageHandler = null;
        abortCurrent = null;
      }

      if (uploadStarted) {
        try {
          const result = await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.transferExit, 0x37, null, 3000);
          if (result?.positive) uploadStarted = false;
        } catch {}
      }

      if (communicationStarted) {
        try {
          const result = await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.stopCommunication, 0x82, null, 3000);
          if (result?.positive) communicationStarted = false;
        } catch {}
      }
    }

    throw error;
  } finally {
    closed = true;
    device.removeEventListener?.("gattserverdisconnected", onDisconnected);
    signal?.removeEventListener("abort", abortRead);
    credits?.removeEventListener?.("characteristicvaluechanged", onCredits);
    fifo?.removeEventListener?.("characteristicvaluechanged", onFifo);
    abortCurrent = null;
    rejectCreditWaiters(new Error("Card transport zatvoren"));
    if (credits) {
      try {
        await queueWrite(credits, [0xff]);
      } catch {}
    }
    try {
      if (disconnectOnFinish && device.gatt.connected) device.gatt.disconnect?.();
    } catch {}
  }
}

export function readBrowserAppV2GoldenCardPayload(options = {}) {
  const bluetooth = typeof navigator === "undefined" ? null : navigator.bluetooth;
  return readAppV2GoldenCardPayload({
    ...options,
    bluetooth,
  });
}

export function selectBrowserAppV2GoldenCardDevice() {
  const bluetooth = typeof navigator === "undefined" ? null : navigator.bluetooth;
  return selectAppV2GoldenCardDevice({ bluetooth });
}
