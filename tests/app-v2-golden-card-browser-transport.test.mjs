import assert from "node:assert/strict";
import test from "node:test";

import { readAppV2GoldenCardPayload } from "../lib/app-v2-golden-card-browser-transport.js";

const checksum = (bytes) => bytes.reduce((sum, value) => (sum + value) & 0xff, 0);
const ddp = (data) => Uint8Array.from([0x80, 0xf0, 0xee, data.length, ...data, checksum([0x80, 0xf0, 0xee, data.length, ...data])]);

class FakeCharacteristic {
  constructor(uuid) {
    this.uuid = uuid;
    this.listeners = new Map();
    this.writes = [];
    this.properties = { write: true };
  }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  async startNotifications() {}
  async writeValueWithResponse(value) {
    this.writes.push(Array.from(value));
    if (this.onWrite) await this.onWrite(Array.from(value));
  }
  emit(bytes) {
    const array = Uint8Array.from(bytes);
    const view = new DataView(array.buffer);
    this.listeners.get("characteristicvaluechanged")?.({ target: { value: view } });
  }
}

function wrapIts(message) {
  return [1, 1, ...message];
}

test("browser card transport follows bounded golden-compatible full-read sequence", async () => {
  const fifo = new FakeCharacteristic("29d3a479-1592-47df-80a4-afa742d369bb");
  const credits = new FakeCharacteristic("db9c4128-bff3-41fe-a306-fb6f9a8aeb2d");

  const commandLog = [];
  const payload = [0x05,0x04,0x02,0x00,0xfa,...new Array(250).fill(0x11)];
  const firstPayload = payload.slice(0, 251);
  const finalPayload = payload.slice(251);

  fifo.onWrite = async (write) => {
    commandLog.push(write);
    const body = write.slice(2);
    const sid = body[4];

    queueMicrotask(() => credits.emit([1]));

    if (body[0] === 0x80 && body[4] === 0x83) {
      queueMicrotask(() => fifo.emit(wrapIts(ddp([0x76,0x06,0x00,0x02,...finalPayload]))));
      return;
    }
    if (body[0] === 0x81 && body[1] === 0xee && body[2] === 0xf0 && body[3] === 0x81) {
      queueMicrotask(() => fifo.emit(wrapIts(ddp([0xc1,0xea,0x8f]))));
    }
    else if (sid === 0x10) queueMicrotask(() => fifo.emit(wrapIts(ddp([0x50,0x81]))));
    else if (sid === 0x35) queueMicrotask(() => fifo.emit(wrapIts(ddp([0x75,0x00,0xff]))));
    else if (sid === 0x36) {
      queueMicrotask(() => fifo.emit(wrapIts(ddp([0x76,0x06,0x00,0x01,...firstPayload]))));
    }
    else if (sid === 0x37) queueMicrotask(() => fifo.emit(wrapIts(ddp([0x77]))));
    else if (sid === 0x82) queueMicrotask(() => fifo.emit(wrapIts(ddp([0xc2]))));
  };

  credits.onWrite = async (write) => {
    if (write[0] === 1) queueMicrotask(() => credits.emit([8]));
  };

  const service = {
    uuid: "eef90782-55dd-4388-b80b-695aba7a69b5",
    getCharacteristics: async () => [fifo, credits],
  };
  const gatt = {
    connected: true,
    connect: async () => ({
      getPrimaryServices: async () => [service],
    }),
    disconnect() { this.connected = false; },
  };
  const bluetooth = {
    requestDevice: async () => ({ name: "DTCO", gatt }),
  };
  const progress = [];

  const result = await readAppV2GoldenCardPayload({
    bluetooth,
    requestTimeoutMs: 100,
    cardIdleTimeoutMs: 100,
    p3GuardMs: 0,
    onProgress: (value) => progress.push(value),
  });

  assert.equal(result.fieldProven, true);
  assert.equal(result.transport, "golden-0.32c");
  assert.equal(result.fieldProofScope, "VDO-DTCO-4.1a-Android-Chrome-Slot1-2026-09-19");
  assert.equal(result.submessages, 2);
  assert.equal(result.tlvCount, 1);
  assert.deepEqual(Array.from(result.payload), payload);
  assert.deepEqual(progress, [
    { submessages: 1, byteLength: 251, complete: false },
    { submessages: 2, byteLength: 255, complete: true },
  ]);

  assert.equal(gatt.connected, false);
  assert.deepEqual(credits.writes.at(-1), [0xff]);

  const appMessages = commandLog.map((write) => write.slice(2));
  assert.equal(appMessages.filter((msg) => msg[4] === 0x36).length, 1);
  assert.ok(appMessages.some((msg) => msg[4] === 0x37));
  assert.ok(appMessages.some((msg) => msg[4] === 0x82));

  gatt.connected = true;
  const sharedDevice = { name: "DTCO", gatt };
  const sharedResult = await readAppV2GoldenCardPayload({
    device: sharedDevice,
    disconnectOnFinish: false,
    requestTimeoutMs: 100,
    cardIdleTimeoutMs: 100,
    p3GuardMs: 0,
  });
  assert.equal(sharedResult.transport, "golden-0.32c");
  assert.equal(gatt.connected, true, "shared LIVE connection must remain open after card teardown");
});

test("browser card transport keeps the scoped physical field-proof marker in source", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../lib/app-v2-golden-card-browser-transport.js", import.meta.url), "utf8");
  assert.match(source, /fieldProven: true/);
  assert.match(source, /VDO-DTCO-4\.1a-Android-Chrome-Slot1-2026-09-19/);
  assert.doesNotMatch(source, /fieldProven: false/);
  assert.doesNotMatch(source, /saveLastGoodCardSnapshot|localStorage|parseAppV2CardPayload/);
});
