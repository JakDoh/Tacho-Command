import assert from "node:assert/strict";
import test from "node:test";

import { createAppV2CardSession } from "../lib/app-v2-card-session.js";
import { runAppV2CardRead } from "../lib/app-v2-card-read-controller.js";

const be16 = (value) => [(value >> 8) & 0xff, value & 0xff];
const be32 = (value) => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];
const changeWord = ({ card = 0, activity = 0, minute = 0 }) =>
  ((card & 1) << 13) | ((activity & 3) << 11) | (minute & 0x07ff);

function canonicalPayload() {
  const date = Math.floor(Date.parse("2026-09-19T00:00:00Z") / 1000);
  const changes = [
    changeWord({ activity: 0, minute: 0 }),
    changeWord({ activity: 2, minute: 300 }),
    changeWord({ activity: 3, minute: 330 }),
  ];
  const recordLength = 12 + changes.length * 2;
  const record = Uint8Array.from([
    ...be16(0),
    ...be16(recordLength),
    ...be32(date),
    0x00, 0x01,
    0x00, 0x00,
    ...changes.flatMap((word) => be16(word)),
  ]);
  const buffer = new Uint8Array(64);
  buffer.set(record, 0);
  const value = Uint8Array.from([
    ...be16(0),
    ...be16(0),
    ...buffer,
  ]);
  return Uint8Array.from([
    0x05, 0x04, 0x02,
    ...be16(value.length),
    ...value,
  ]);
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

const previousCard = Object.freeze({
  cardReadComplete: true,
  historyDaysAvailable: 56,
  historyDays: Object.freeze([]),
  lastCardReadAtIso: "2026-09-12T08:00:00.000Z",
});

test("card read controller atomically replaces state only after canonical pipeline acceptance", async () => {
  const session = createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  });

  const result = await runAppV2CardRead({
    session,
    storage: memoryStorage(),
    capturedAtIso: "2026-09-19T09:45:00.000Z",
    readCompletedPayload: async () => canonicalPayload(),
  });

  assert.equal(result.status, "accepted");
  assert.equal(result.session.phase, "accepted");
  assert.notEqual(result.session.currentCard, previousCard);
  assert.equal(result.session.capturedAtIso, "2026-09-19T09:45:00.000Z");
});

test("card read controller preserves previous card when the full read throws", async () => {
  const session = createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  });

  const result = await runAppV2CardRead({
    session,
    storage: memoryStorage(),
    readCompletedPayload: async () => {
      throw new Error("transport failed");
    },
  });

  assert.equal(result.status, "read_error");
  assert.equal(result.session.phase, "error");
  assert.equal(result.session.currentCard, previousCard);
  assert.equal(result.session.capturedAtIso, previousCard.lastCardReadAtIso);
});

test("card read controller preserves previous card when parser pipeline rejects payload", async () => {
  const session = createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  });

  const result = await runAppV2CardRead({
    session,
    storage: memoryStorage(),
    readCompletedPayload: async () => Uint8Array.from([1, 2, 3]),
  });

  assert.equal(result.status, "parser_error");
  assert.equal(result.session.phase, "error");
  assert.equal(result.session.currentCard, previousCard);
  assert.equal(result.session.capturedAtIso, previousCard.lastCardReadAtIso);
});

test("card read controller fails closed when no read callback is provided", async () => {
  const session = createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  });

  const result = await runAppV2CardRead({ session, storage: memoryStorage() });

  assert.equal(result.status, "read_unavailable");
  assert.equal(result.session.currentCard, previousCard);
});
