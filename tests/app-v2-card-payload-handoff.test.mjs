import assert from "node:assert/strict";
import test from "node:test";

import { handoffCompletedCardPayload } from "../lib/app-v2-card-payload-handoff.js";

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
