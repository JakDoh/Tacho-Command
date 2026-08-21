import test from "node:test";
import assert from "node:assert/strict";
import {
  DDP_REQUEST_DRIVER_CARD_SLOT_1,
  DDP_REQUEST_OVERVIEW_GEN2,
  DDP_REQUEST_TRANSFER_EXIT,
  DDP_REQUEST_UPLOAD,
  DDP_START_COMMUNICATION_REQUEST,
  DDP_START_DIAGNOSTIC_SESSION_REQUEST,
  DDP_STOP_COMMUNICATION_REQUEST,
  buildDdpSubMessageAck,
} from "../lib/tacho-download.js";
import { runDdpCardDownload } from "../lib/tacho-download-runner.js";

const frame = (data) => {
  const message = [0x80, 0xf0, 0xee, data.length, ...data];
  return [...message, message.reduce((sum, byte) => (sum + byte) & 0xff, 0)];
};

const positive = {
  start: frame([0xc1, 0xea, 0x8f]),
  diagnostic: frame([0x50, 0x81]),
  upload: frame([0x75, 0x00, 0xff]),
  exit: frame([0x77]),
  stop: frame([0xc2]),
};

const createTransport = (responses) => {
  const queue = [...responses];
  const sent = [];
  let disconnected = false;
  return {
    sent,
    get disconnected() { return disconnected; },
    async send(message) { sent.push([...message]); },
    async receive() { return queue.shift() ?? null; },
    async disconnect() { disconnected = true; },
  };
};

const successResponses = () => [
  positive.start,
  positive.diagnostic,
  positive.upload,
  frame([0x76, 0x21, 0x00, 0x01, 0x01]),
  frame([0x76, 0x06, 0x00, 0x01, ...new Array(251).fill(0x44)]),
  frame([0x76, 0x06, 0x00, 0x02, 0xaa, 0xbb]),
  positive.exit,
  positive.stop,
];

test("runs the complete card download and confirms the ordered close", async () => {
  const transport = createTransport(successResponses());
  const result = await runDdpCardDownload(transport, { p3Ms: 0 });
  assert.equal(result.status, "complete");
  assert.equal(result.cardData.length, 253);
  assert.deepEqual(result.teardown, { transferExitConfirmed: true, stopConfirmed: true });
  assert.equal(transport.disconnected, true);
  assert.deepEqual(transport.sent, [
    DDP_START_COMMUNICATION_REQUEST,
    DDP_START_DIAGNOSTIC_SESSION_REQUEST,
    DDP_REQUEST_UPLOAD,
    DDP_REQUEST_OVERVIEW_GEN2,
    buildDdpSubMessageAck(2),
    DDP_REQUEST_DRIVER_CARD_SLOT_1,
    buildDdpSubMessageAck(2),
    buildDdpSubMessageAck(3),
    DDP_REQUEST_TRANSFER_EXIT,
    DDP_STOP_COMMUNICATION_REQUEST,
  ]);
});

test("continues after response-pending without retransmitting the active request", async () => {
  const responses = successResponses();
  responses.splice(2, 0, frame([0x7f, 0x35, 0x78]));
  const transport = createTransport(responses);
  const result = await runDdpCardDownload(transport, { p3Ms: 0 });
  assert.equal(result.status, "complete");
  assert.equal(transport.sent.filter((message) => message === DDP_REQUEST_UPLOAD || JSON.stringify(message) === JSON.stringify(DDP_REQUEST_UPLOAD)).length, 1);
});

test("retries a timed-out request at most three transmissions", async () => {
  const transport = createTransport([]);
  const result = await runDdpCardDownload(transport, { p2Ms: 0, p3Ms: 0 });
  assert.equal(result.status, "failed");
  assert.equal(result.failure.phase, "start-communication");
  assert.equal(transport.sent.length, 3);
  assert.equal(transport.disconnected, true);
});

test("after card-transfer timeout it attempts TransferExit then StopCommunication", async () => {
  const transport = createTransport([
    positive.start,
    positive.diagnostic,
    positive.upload,
    frame([0x76, 0x21, 0x00, 0x01, 0x01]),
    null,
    null,
    null,
    positive.exit,
    positive.stop,
  ]);
  const result = await runDdpCardDownload(transport, { p2Ms: 0, pendingMs: 0, p3Ms: 0 });
  assert.equal(result.status, "failed");
  assert.equal(result.failure.phase, "driver-card-slot-1");
  assert.deepEqual(transport.sent.slice(-5), [
    DDP_REQUEST_DRIVER_CARD_SLOT_1,
    DDP_REQUEST_DRIVER_CARD_SLOT_1,
    DDP_REQUEST_DRIVER_CARD_SLOT_1,
    DDP_REQUEST_TRANSFER_EXIT,
    DDP_STOP_COMMUNICATION_REQUEST,
  ]);
  assert.deepEqual(result.teardown, { transferExitConfirmed: true, stopConfirmed: true });
});

test("still sends StopCommunication when TransferExit never answers", async () => {
  const transport = createTransport([
    positive.start,
    positive.diagnostic,
    positive.upload,
    frame([0x76, 0x21, 0x00, 0x01, 0x01]),
    frame([0x7f, 0x36, 0x31]),
    null,
    null,
    null,
    positive.stop,
  ]);
  const result = await runDdpCardDownload(transport, { p2Ms: 0, pendingMs: 0, p3Ms: 0 });
  assert.equal(result.status, "failed");
  assert.equal(result.teardown.transferExitConfirmed, false);
  assert.equal(result.teardown.stopConfirmed, true);
  assert.deepEqual(transport.sent.slice(-4), [
    DDP_REQUEST_TRANSFER_EXIT,
    DDP_REQUEST_TRANSFER_EXIT,
    DDP_REQUEST_TRANSFER_EXIT,
    DDP_STOP_COMMUNICATION_REQUEST,
  ]);
});
