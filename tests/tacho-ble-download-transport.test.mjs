import test from "node:test";
import assert from "node:assert/strict";
import { createBleDownloadTransport } from "../lib/tacho-ble-download-transport.js";

test("uses one additive server credit for each FIFO write", async () => {
  const fifoWrites = [];
  const creditWrites = [];
  const transport = createBleDownloadTransport({
    writeFifo: async (bytes) => fifoWrites.push([...bytes]),
    writeCredits: async (bytes) => creditWrites.push([...bytes]),
    creditTimeoutMs: 5,
  });
  await transport.start(2);
  transport.onCredit(2);
  await transport.send([0x81]);
  await transport.send([0x82]);
  assert.equal(transport.ledger.serverCredits, 0);
  assert.deepEqual(fifoWrites, [[1, 1, 0x81], [1, 1, 0x82]]);
  assert.deepEqual(creditWrites, [[2]]);
  await assert.rejects(transport.send([0x83]), /credit timeout/);
});

test("reassembles many FIFO packets and replenishes exactly one credit per packet", async () => {
  const creditWrites = [];
  const transport = createBleDownloadTransport({
    writeFifo: async () => {},
    writeCredits: async (bytes) => creditWrites.push([...bytes]),
  });
  await transport.start(3);
  transport.onFifo([3, 1, 0x80, 0xf0]);
  transport.onFifo([0, 2, 0xee, 0x01]);
  transport.onFifo([0, 3, 0xc2, 0x21]);
  const message = await transport.receive(5);
  await new Promise((resolve) => setTimeout(resolve, 1));
  assert.deepEqual(message, [0x80, 0xf0, 0xee, 0x01, 0xc2, 0x21]);
  assert.deepEqual(creditWrites, [[3], [1], [1], [1]]);
  assert.equal(transport.ledger.clientCredits, 3);
});

test("rejects a peer packet beyond the granted receive window", async () => {
  const transport = createBleDownloadTransport({ writeFifo: async () => {}, writeCredits: async () => {} });
  await transport.start(1);
  transport.onFifo([2, 1, 0x80]);
  const result = transport.onFifo([0, 2, 0xf0]);
  assert.equal(result.status, "invalid");
  assert.equal(result.reason, "peer-exceeded-credit");
  await assert.rejects(transport.receive(1), /peer-exceeded-credit/);
});

test("waits for a later additive server credit", async () => {
  const fifoWrites = [];
  const transport = createBleDownloadTransport({
    writeFifo: async (bytes) => fifoWrites.push([...bytes]),
    writeCredits: async () => {},
    creditTimeoutMs: 50,
  });
  await transport.start(1);
  const sending = transport.send([0x37]);
  setTimeout(() => transport.onCredit(1), 1);
  await sending;
  assert.deepEqual(fifoWrites, [[1, 1, 0x37]]);
});

test("disconnect sends 0xFF and releases pending operations", async () => {
  const creditWrites = [];
  const transport = createBleDownloadTransport({
    writeFifo: async () => {},
    writeCredits: async (bytes) => creditWrites.push([...bytes]),
    creditTimeoutMs: 100,
  });
  await transport.start(1);
  const receive = transport.receive(100);
  await transport.disconnect();
  assert.equal(await receive, null);
  assert.equal(transport.ledger.closed, true);
  assert.deepEqual(creditWrites, [[1], [0xff]]);
});
