import assert from "node:assert/strict";
import test from "node:test";

import { handoffCanonicalAppV2CardPayload, handoffCompletedCardPayload } from "../lib/app-v2-card-payload-handoff.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

const parserResult = {
  complete: true,
  days: [{
    date: "2026-09-19",
    segments: [
      { activity: "rest", startMinute: 0, endMinute: 300, cardStatus: "not-inserted" },
      { activity: "work", startMinute: 300, endMinute: 330, cardStatus: "inserted" },
      { activity: "driving", startMinute: 330, endMinute: 420, cardStatus: "inserted" },
    ],
  }],
};

test("completed card payload is parsed and routed through the strict card pipeline", async () => {
  const storage = memoryStorage();
  let seenLength = 0;

  const result = await handoffCompletedCardPayload({
    payload: Uint8Array.from([1, 2, 3, 4]),
    storage,
    capturedAtIso: "2026-09-19T09:30:00.000Z",
    parseCard: async (bytes) => {
      seenLength = bytes.byteLength;
      return parserResult;
    },
  });

  assert.equal(seenLength, 4);
  assert.equal(result.status, "accepted");
  assert.equal(result.card.cardReadComplete, true);
  assert.equal(result.card.lastCardReadAtIso, "2026-09-19T09:30:00.000Z");
});

test("empty or missing payload is rejected before parser and storage", async () => {
  let parses = 0;
  let writes = 0;
  const storage = { setItem: () => { writes += 1; } };

  const result = await handoffCompletedCardPayload({
    payload: new Uint8Array(),
    storage,
    parseCard: async () => {
      parses += 1;
      return parserResult;
    },
  });

  assert.equal(result.status, "rejected_payload");
  assert.equal(parses, 0);
  assert.equal(writes, 0);
});

test("parser exceptions fail closed and preserve the previous last-good snapshot", async () => {
  let writes = 0;
  const storage = { setItem: () => { writes += 1; } };

  const result = await handoffCompletedCardPayload({
    payload: Uint8Array.from([1, 2, 3]),
    storage,
    parseCard: async () => {
      throw new Error("parser failed");
    },
  });

  assert.equal(result.status, "parser_error");
  assert.equal(writes, 0);
});

test("handoff contains no card transport protocol or raw parser implementation", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../lib/app-v2-card-payload-handoff.js", import.meta.url), "utf8");

  assert.ok(source.includes("parseCard(bytes)"));
  assert.ok(source.includes("processAppV2ParsedCard"));

  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "sendUds",
    "queueGattWrite",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "parseDddTlv",
    "Driver_Activity_Data",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside completed payload handoff");
  }
});


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
  const activityValue = Uint8Array.from([
    ...be16(0),
    ...be16(0),
    ...buffer,
  ]);
  return Uint8Array.from([
    0x05, 0x04, 0x02,
    ...be16(activityValue.length),
    ...activityValue,
  ]);
}

test("canonical card handoff runs payload through the canonical parser and last-good pipeline", async () => {
  const result = await handoffCanonicalAppV2CardPayload({
    payload: canonicalPayload(),
    storage: memoryStorage(),
    capturedAtIso: "2026-09-19T09:35:00.000Z",
  });

  assert.equal(result.status, "accepted");
  assert.equal(result.card.historyDays.length, 1);
  assert.equal(result.card.historyDays[0].drivingMinutes, 1110);
  assert.equal(result.card.lastCardReadAtIso, "2026-09-19T09:35:00.000Z");
});

test("canonical card handoff rejects duplicate-minute payload before storage", async () => {
  let writes = 0;
  const payload = canonicalPayload();
  const bytes = Uint8Array.from(payload);
  const valueStart = 5 + 4;
  const recordStart = valueStart;
  const duplicateWord = changeWord({ activity: 3, minute: 300 });
  const thirdChangeOffset = recordStart + 12 + 4;
  bytes[thirdChangeOffset] = (duplicateWord >> 8) & 0xff;
  bytes[thirdChangeOffset + 1] = duplicateWord & 0xff;

  const result = await handoffCanonicalAppV2CardPayload({
    payload: bytes,
    storage: { setItem: () => { writes += 1; } },
  });

  assert.equal(result.status, "parser_error");
  assert.equal(writes, 0);
});
