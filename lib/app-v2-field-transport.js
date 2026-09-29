import { boundedBleOperation, claimBleDevice, abortableBleDelay } from "./ble-operation.js";
import {
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "./tacho-ble.js";
import { createUdsResponseCollector } from "./tacho-uds.js";
import {
  buildReadDataByIdentifier,
  classifyStationaryVehicleSpeed,
  RHMI_DIDS,
} from "./tacho-rhmi.js";

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

export async function openAppV2FieldTransport({
  bluetooth,
  timeoutMs = 4000,
  settleMs = 1000,
  closeTimeoutMs = 1000,
  operationTimeoutMs = 15000,
  writeTimeoutMs = 7000,
  signal,
} = {}) {
  if (!bluetooth || typeof bluetooth.requestDevice !== "function") {
    throw new Error("Web Bluetooth nije dostupan.");
  }

  const device = await boundedBleOperation(() => bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS,
  }), { signal, timeoutMs: Infinity });
  if (!device?.gatt) throw new Error("GATT interfejs nije dostupan");

  const lease = claimBleDevice(device);
  const stopped = new AbortController();
  let pendingRequest = null;
  let creditResolver = null;
  let closed = false;
  let writesAbandoned = false;
  const abort = () => {
    closed = true;
    writesAbandoned = true;
    stopped.abort();
    pendingRequest?.reject(new Error("Bluetooth veza je prekinuta"));
    pendingRequest = null;
    creditResolver?.(0xff);
    creditResolver = null;
    removeListeners();
    lease.close();
  };
  const bounded = (operation, label) => boundedBleOperation(operation, {
    signal: stopped.signal, timeoutMs: operationTimeoutMs, label,
    onLateResult: () => { if (!lease.active()) lease.disconnectIfOwner(); },
  });
  const listeners = [];
  const listen = (target, name, handler) => {
    target.addEventListener?.(name, handler);
    listeners.push(() => target.removeEventListener?.(name, handler));
  };
  const removeListeners = () => { for (const remove of listeners.splice(0)) remove(); };
  signal?.addEventListener("abort", abort, { once: true });
  listeners.push(() => signal?.removeEventListener("abort", abort));
  if (signal?.aborted) abort();
  try {
  const server = await bounded(() => device.gatt.connect(), "LIVE_CONNECT");
  const services = await bounded(() => server.getPrimaryServices(), "LIVE_SERVICES");
  const diagnostics = services.find(
    (service) => normalizeUuid(service.uuid) === normalizeUuid(TACHO_DIAGNOSTICS_SERVICE_UUID),
  );
  if (!diagnostics) throw new Error("Smart Tacho Diagnostics servis nije pronađen");

  const characteristics = await bounded(() => diagnostics.getCharacteristics(), "LIVE_CHARACTERISTICS");
  const fifo = characteristics.find(
    (characteristic) => normalizeUuid(characteristic.uuid) === normalizeUuid(TACHO_DIAGNOSTICS_FIFO_UUID),
  );
  const credits = characteristics.find(
    (characteristic) => normalizeUuid(characteristic.uuid) === normalizeUuid(TACHO_DIAGNOSTICS_CREDITS_UUID),
  );
  if (!fifo || !credits) throw new Error("FIFO/Credits karakteristike nisu pronađene");

  let writeQueue = Promise.resolve();
  const queueWrite = (characteristic, bytes, permitted = () => true) => {
    const operation = writeQueue.catch(() => {}).then(() => {
      if (writesAbandoned || !lease.active()) throw new Error("LIVE_WRITES_ABANDONED");
      if (!permitted()) throw new Error("LIVE_REQUEST_EXPIRED");
      return boundedBleOperation(() => writeGatt(characteristic, bytes), {
        signal: stopped.signal, timeoutMs: writeTimeoutMs, label: "LIVE_WRITE",
      }).catch(error => { abort(); throw error; });
    });
    writeQueue = operation.catch(() => {});
    return operation;
  };

  listen(device, "gattserverdisconnected", abort);

  listen(fifo, "characteristicvaluechanged", (event) => {
    const view = event?.target?.value;
    if (!view?.byteLength) return;
    const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));

    void queueWrite(credits, [1]).catch(() => {});

    if (!pendingRequest) return;
    const result = pendingRequest.collector.push(packet);
    if (result.status === "complete") {
      const request = pendingRequest;
      pendingRequest = null;
      request.resolve(Array.from(result.response ?? []));
    } else if (result.status === "invalid") {
      const request = pendingRequest;
      pendingRequest = null;
      request.reject(new Error("ITS paket nije validan: " + String(result.reason ?? "unknown")));
    }
  });

  listen(credits, "characteristicvaluechanged", (event) => {
    const view = event?.target?.value;
    if (!view?.byteLength || !creditResolver) return;
    const resolve = creditResolver;
    creditResolver = null;
    resolve(view.getUint8(0));
  });

  await bounded(() => credits.startNotifications(), "LIVE_NOTIFICATIONS");
  await bounded(() => fifo.startNotifications(), "LIVE_NOTIFICATIONS");

  const serverCreditPromise = new Promise((resolve) => {
    creditResolver = resolve;
  });
  await queueWrite(credits, [1]);
  const serverCredit = await Promise.race([
    serverCreditPromise,
    sleep(timeoutMs).then(() => null),
  ]);
  creditResolver = null;

  if (serverCredit === null) throw new Error("Server credit timeout");
  if (serverCredit === 0xff) throw new Error("Tahograf je odbio flow control");

  const sendUds = async (payload, requestTimeoutMs = timeoutMs) => {
    if (closed) throw new Error("Field transport je zatvoren");
    if (pendingRequest) throw new Error("Paralelni UDS zahtev nije dozvoljen");

    const collector = createUdsResponseCollector(payload);
    return new Promise((resolve, reject) => {
      let completed = false;
      const timer = setTimeout(() => {
        if (pendingRequest?.collector === collector) pendingRequest = null;
        if (completed) return;
        completed = true;
        resolve(null);
      }, requestTimeoutMs);

      const finishResolve = (response) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        resolve(response);
      };
      const finishReject = (error) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        reject(error);
      };

      pendingRequest = {
        collector,
        resolve: finishResolve,
        reject: finishReject,
      };

      queueWrite(fifo, [1, 1, ...payload], () => pendingRequest?.collector === collector).catch((error) => {
        if (pendingRequest?.collector === collector) pendingRequest = null;
        finishReject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  };

  const testerPresent = await sendUds([0x3e, 0x00], timeoutMs);
  if (!testerPresent || testerPresent[2] !== 0x7e) {
    throw new Error("TesterPresent nije dobio pozitivan odgovor");
  }

  if (settleMs > 0) await abortableBleDelay(settleMs, stopped.signal);

  const assertStationary = async () => {
    const response = await sendUds(
      buildReadDataByIdentifier(RHMI_DIDS.TACHOGRAPH_VEHICLE_SPEED),
      timeoutMs,
    );
    const speed = classifyStationaryVehicleSpeed(response ?? []);
    if (!speed.valid) throw new Error("Brzina tahografa nije potvrđena — BLE veza je prekinuta.");
    if (!speed.stationary) throw new Error("Vozilo nije na 0 km/h — BLE veza je prekinuta.");
    return speed;
  };

  try {
    await assertStationary();
  } catch (error) {
    closed = true;
    pendingRequest = null;
    creditResolver = null;
    try { await boundedBleOperation(() => queueWrite(credits, [0xff]), { timeoutMs: closeTimeoutMs, label: "LIVE_CLOSE" }); } catch {}
    lease.close();
    throw error;
  }

  let closePromise = null;
  const close = () => {
    if (closePromise) return closePromise;
    if (closed) { removeListeners(); return Promise.resolve(); }
    closed = true;
    pendingRequest?.reject(new Error("Field transport je zatvoren"));
    removeListeners();
    pendingRequest = null;
    creditResolver = null;
    closePromise = (async () => {
      let timer;
      try {
        await Promise.race([
          queueWrite(credits, [0xff]),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("LIVE_CLOSE_TIMEOUT")), closeTimeoutMs);
          }),
        ]);
      } finally {
        clearTimeout(timer);
        // Seal the old queue before allowing another session to use this device.
        // A late GATT completion must never write again or disconnect its successor.
        writesAbandoned = true;
        lease.close();
      }
    })();
    return closePromise;
  };

  return Object.freeze({
    deviceLabel: device.name || "Tahograf",
    device,
    server,
    sendUds,
    assertStationary,
    isConnected: () => !closed && device.gatt?.connected !== false,
    close,
  });
  } catch (error) {
    abort();
    removeListeners();
    lease.close();
    throw error;
  }
}


export function openBrowserAppV2FieldTransport(options = {}) {
  const bluetooth = typeof navigator === "undefined" ? null : navigator.bluetooth;
  return openAppV2FieldTransport({
    ...options,
    bluetooth,
  });
}
