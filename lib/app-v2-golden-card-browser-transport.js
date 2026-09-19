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
  requestTimeoutMs = 7000,
  cardIdleTimeoutMs = 20 * 60 * 1000,
  p3GuardMs = 100,
} = {}) {
  if (!bluetooth || typeof bluetooth.requestDevice !== "function") {
    throw new Error("Web Bluetooth nije dostupan.");
  }

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS,
  });
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

  const releaseCredits = () => {
    while (serverCredits > 0 && creditWaiters.length) {
      const waiter = creditWaiters.shift();
      serverCredits -= 1;
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
  };

  const consumeServerCredit = async () => {
    if (peerClosed) throw new Error("Tahograf je zatvorio Download flow control");
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
    if (closed) throw new Error("Card transport je zatvoren");
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
    const server = await device.gatt.connect();
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

    credits.addEventListener("characteristicvaluechanged", (event) => {
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

    fifo.addEventListener("characteristicvaluechanged", (event) => {
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

    await credits.startNotifications();
    await fifo.startNotifications();
    await queueWrite(credits, [1]);

    requirePositive(
      "DDP StartCommunication",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.startCommunication, 0x81),
      0x81,
    );
    communicationStarted = true;

    requirePositive(
      "DDP StartDiagnosticSession 0x81",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.startDiagnosticSession, 0x10),
      0x10,
    );

    requirePositive(
      "DDP RequestUpload",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.requestUpload, 0x35),
      0x35,
    );
    uploadStarted = true;
    cardTransferActive = true;

    const transfer = await new Promise((resolve, reject) => {
      if (messageHandler) {
        reject(new Error("Paralelni DDP zahtev nije dozvoljen"));
        return;
      }

      const assembler = createAppV2GoldenCardAssembler();
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
        timer = setTimeout(() => finish(null), cardIdleTimeoutMs);
      };

      const handler = (response) => {
        const result = assembler.push(response);
        if (result.status === "ignored") return;
        lastVuResponseAt = performance.now();

        if (result.status === "pending") {
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
      arm();
      void sendApp(APP_V2_GOLDEN_CARD_COMMANDS.cardSlot1).catch(fail);
    });

    cardTransferActive = false;
    if (!transfer) throw new Error("Card Download TREP 06: TIMEOUT");

    const tlv = validateAppV2GoldenCardTlv(transfer.payload);
    if (!tlv.valid) {
      throw new Error("Card payload TLV validacija nije prošla: " + String(tlv.reason ?? "unknown"));
    }

    requirePositive(
      "DDP RequestTransferExit",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.transferExit, 0x37),
      0x37,
    );
    uploadStarted = false;

    requirePositive(
      "DDP StopCommunication",
      await sendSimple(APP_V2_GOLDEN_CARD_COMMANDS.stopCommunication, 0x82),
      0x82,
    );
    communicationStarted = false;

    return Object.freeze({
      payload: transfer.payload,
      submessages: transfer.submessages,
      byteLength: transfer.total,
      tlvCount: tlv.count,
      transportCandidate: "golden-compatible-0.32c",
      fieldProven: false,
    });
  } catch (error) {
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
    abortCurrent = null;
    rejectCreditWaiters(new Error("Card transport zatvoren"));
    if (credits) {
      try {
        await queueWrite(credits, [0xff]);
      } catch {}
    }
    try {
      if (device.gatt.connected) device.gatt.disconnect?.();
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
