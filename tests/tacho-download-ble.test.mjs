import test from "node:test";
import assert from "node:assert/strict";
import { createBleDdpTransport } from "../lib/tacho-download-ble.js";

class MockCharacteristic {
  listeners = [];
  value = null;
  async startNotifications() { return this; }
  addEventListener(_type, listener) { this.listeners.push(listener); }
  emit(bytes) {
    const value = Uint8Array.from(bytes);
    this.value = new DataView(value.buffer);
    for (const listener of this.listeners) listener({ target: this });
  }
}

const setup = () => {
  const fifo = new MockCharacteristic();
  const credits = new MockCharacteristic();
  const writes = [];
  const transport = createBleDdpTransport({
    fifo,
    credits,
    receiveWindow: 2,
    mtuPayload: 4,
    creditTimeoutMs: 20,
    async write(characteristic, bytes) { writes.push({ characteristic, bytes: [...bytes] }); },
  });
  return { fifo, credits, writes, transport };
};

test("establishes flow control and spends exactly one server credit per FIFO packet", async () => {
  const context = setup();
  const starting = context.transport.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  context.credits.emit([2]);
  await starting;
  await context.transport.send([1, 2, 3, 4, 5]);
  assert.deepEqual(context.writes.map((entry) => entry.bytes), [
    [2],
    [2, 1, 1, 2, 3, 4],
    [0, 2, 5],
  ]);
  assert.equal(context.transport.ledger.serverCredits, 0);
  await context.transport.disconnect();
});

test("reassembles incoming multi-packet messages and replenishes every consumed credit", async () => {
  const context = setup();
  const starting = context.transport.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  context.credits.emit([1]);
  await starting;
  context.fifo.emit([2, 1, 0x80, 0xf0]);
  context.fifo.emit([0, 2, 0xee, 0x01, 0xc2, 0x21]);
  const message = await context.transport.receive(20);
  assert.deepEqual(message, [0x80, 0xf0, 0xee, 0x01, 0xc2, 0x21]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(context.writes.map((entry) => entry.bytes), [[2], [1], [1]]);
  assert.equal(context.transport.ledger.clientCredits, 2);
  await context.transport.disconnect();
});

test("blocks writes until another additive server credit arrives", async () => {
  const context = setup();
  const starting = context.transport.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  context.credits.emit([1]);
  await starting;
  const sending = context.transport.send([1, 2, 3, 4, 5]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(context.writes.length, 2);
  context.credits.emit([1]);
  await sending;
  assert.equal(context.writes.length, 3);
  await context.transport.disconnect();
});

test("fails closed if the peer exceeds granted receive credits", async () => {
  const context = setup();
  const starting = context.transport.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  context.credits.emit([1]);
  await starting;
  context.fifo.emit([3, 1, 1]);
  context.fifo.emit([0, 2, 2]);
  context.fifo.emit([0, 3, 3]);
  assert.equal(await context.transport.receive(1), null);
  assert.equal(context.transport.ledger.failure, "peer-exceeded-credit");
});

test("sends credit 0xFF on controlled disconnect", async () => {
  const context = setup();
  const starting = context.transport.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  context.credits.emit([1]);
  await starting;
  await context.transport.disconnect();
  assert.deepEqual(context.writes.at(-1).bytes, [0xff]);
});

test("peer credit 0xFF closes pending receives without echoing a disconnect", async () => {
  const context = setup();
  const starting = context.transport.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  context.credits.emit([1]);
  await starting;
  const receiving = context.transport.receive(20);
  context.credits.emit([0xff]);
  assert.equal(await receiving, null);
  await context.transport.disconnect();
  assert.equal(context.writes.some((entry) => entry.bytes[0] === 0xff), false);
});
