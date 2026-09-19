import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
} from "../lib/tacho-ble.js";
import { openAppV2FieldTransport } from "../lib/app-v2-field-transport.js";

function valueEvent(bytes) {
  const array = Uint8Array.from(bytes);
  return { target: { value: new DataView(array.buffer) } };
}

function characteristic(uuid, onWrite) {
  const listeners = new Map();
  return {
    uuid,
    properties: { write: true, writeWithoutResponse: true },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    startNotifications: async () => this,
    writeValueWithResponse: async (value) => onWrite?.(Array.from(new Uint8Array(value)), listeners),
  };
}

function bluetoothFixture() {
  const writes = [];
  let disconnected = 0;
  let fifo;
  let credits;

  credits = characteristic(TACHO_DIAGNOSTICS_CREDITS_UUID, async (bytes, listeners) => {
    writes.push(["credits", bytes]);
    if (bytes[0] === 1) {
      queueMicrotask(() => listeners.get("characteristicvaluechanged")?.(valueEvent([1])));
    }
  });

  fifo = characteristic(TACHO_DIAGNOSTICS_FIFO_UUID, async (bytes, listeners) => {
    writes.push(["fifo", bytes]);
    if (bytes[0] === 1 && bytes[1] === 1) {
      const payload = bytes.slice(2);
      if (payload[0] === 0x3e) {
        queueMicrotask(() => listeners.get("characteristicvaluechanged")?.(valueEvent([1, 1, 0x7e, payload[1] ?? 0x00])));
      } else if (payload[0] === 0x22) {
        queueMicrotask(() => listeners.get("characteristicvaluechanged")?.(
          valueEvent([1, 1, 0x62, payload[1], payload[2], 0x00, 0x2a]),
        ));
      }
    }
  });

  const device = {
    name: "DTCO 4.1a",
    gatt: {
      connect: async () => ({
        getPrimaryServices: async () => [{
          uuid: TACHO_DIAGNOSTICS_SERVICE_UUID,
          getCharacteristics: async () => [fifo, credits],
        }],
      }),
      disconnect: () => { disconnected += 1; },
    },
  };

  return {
    bluetooth: {
      requestDevice: async () => device,
    },
    writes,
    get disconnected() {
      return disconnected;
    },
  };
}

test("transport factory establishes FIFO/Credits, validates TesterPresent and exposes sendUds", async () => {
  const fixture = bluetoothFixture();
  const transport = await openAppV2FieldTransport({
    bluetooth: fixture.bluetooth,
    timeoutMs: 100,
    settleMs: 0,
  });

  assert.equal(transport.deviceLabel, "DTCO 4.1a");
  const response = await transport.sendUds([0x22, 0xf9, 0x23], 100);
  assert.deepEqual(response, [1, 1, 0x62, 0xf9, 0x23, 0x00, 0x2a]);

  await transport.close();
  assert.equal(fixture.disconnected, 1);
  assert.ok(fixture.writes.some(([kind, bytes]) => kind === "credits" && bytes[0] === 0xff));
});

test("transport factory serializes GATT writes and rejects concurrent UDS requests", async () => {
  const fixture = bluetoothFixture();
  const transport = await openAppV2FieldTransport({
    bluetooth: fixture.bluetooth,
    timeoutMs: 100,
    settleMs: 0,
  });

  const first = transport.sendUds([0x22, 0xf9, 0x23], 100);
  await assert.rejects(
    () => transport.sendUds([0x22, 0xf9, 0x25], 100),
    /Paralelni UDS zahtev nije dozvoljen/,
  );
  await first;
  await transport.close();
});

test("transport factory fails when Web Bluetooth is unavailable", async () => {
  await assert.rejects(
    () => openAppV2FieldTransport({ bluetooth: null, timeoutMs: 20, settleMs: 0 }),
    /Web Bluetooth nije dostupan/,
  );
});

test("transport source stays product-agnostic and read-only", async () => {
  const source = await readFile(new URL("../lib/app-v2-field-transport.js", import.meta.url), "utf8");

  assert.ok(source.includes("requestDevice"));
  assert.ok(source.includes("createUdsResponseCollector"));
  assert.ok(source.includes("[0x3e, 0x00]"));
  assert.ok(source.includes("queueWrite(credits, [0xff])"));

  for (const forbidden of [
    "FieldProvenPremiumUi",
    "createFieldProvenProductState",
    "last-good-card-snapshot",
    "postTechnicalTelemetry",
    "localStorage",
    "RequestTransferExit",
    "StopCommunication",
    "TREP",
    "0x31, 0x01, 0xf2, 0x11",
    "0x10, 0x7e",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside the field transport factory");
  }
});
