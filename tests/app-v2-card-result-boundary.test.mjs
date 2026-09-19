import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { acceptAppV2CardResult } from "../lib/app-v2-card-result-boundary.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

const completeCard = {
  driverName: "Driver",
  cardLast4: "1234",
  cardReadComplete: true,
  historyDaysAvailable: 2,
  fortnightDrivingMinutes: 600,
  historyRangeStartIso: "2026-09-18",
  historyRangeEndIso: "2026-09-19",
  historyDays: [
    {
      dateIso: "2026-09-18",
      dateLabel: "18.09.",
      drivingMinutes: 120,
      segments: [
        { kind: "drive", minutes: 60, startMinute: 480, endMinute: 540, cardStatus: "inserted" },
        { kind: "work", minutes: 60, startMinute: 540, endMinute: 600, cardStatus: "inserted" },
      ],
      events: [{ kind: "card-inserted", minute: 480 }],
    },
    {
      dateIso: "2026-09-19",
      dateLabel: "19.09.",
      drivingMinutes: 90,
      segments: [
        { kind: "drive", minutes: 90, startMinute: 420, endMinute: 510, cardStatus: "inserted" },
      ],
      events: [],
    },
  ],
  slotLabel: "Driver 1",
};

test("card result boundary accepts only a complete normalized card and persists it as last-good", () => {
  const storage = memoryStorage();
  const result = acceptAppV2CardResult({
    storage,
    cardState: completeCard,
    capturedAtIso: "2026-09-19T09:20:00.000Z",
  });

  assert.equal(result.status, "accepted");
  assert.equal(result.card.cardReadComplete, true);
  assert.equal(result.card.historyDays.length, 2);
  assert.equal(result.card.lastCardReadAtIso, "2026-09-19T09:20:00.000Z");
  assert.equal(result.snapshot.card.historyRangeEndIso, "2026-09-19");
});

test("card result boundary refuses incomplete reads and never overwrites storage", () => {
  let writes = 0;
  const storage = {
    getItem: () => null,
    setItem: () => { writes += 1; },
  };

  const result = acceptAppV2CardResult({
    storage,
    cardState: { ...completeCard, cardReadComplete: false },
  });

  assert.equal(result.status, "rejected_incomplete");
  assert.equal(result.card, null);
  assert.equal(writes, 0);
});

test("card result boundary refuses malformed history before persistence", () => {
  let writes = 0;
  const storage = {
    getItem: () => null,
    setItem: () => { writes += 1; },
  };

  const result = acceptAppV2CardResult({
    storage,
    cardState: {
      ...completeCard,
      historyDays: [{
        dateIso: "2026-09-19",
        dateLabel: "19.09.",
        drivingMinutes: 90,
        segments: [{ kind: "drive", minutes: 90, startMinute: 600, endMinute: 500 }],
      }],
    },
  });

  assert.equal(result.status, "rejected_incomplete");
  assert.equal(writes, 0);
});

test("card result boundary contains no transport, Bluetooth or raw DDD parsing", async () => {
  const source = await readFile(new URL("../lib/app-v2-card-result-boundary.js", import.meta.url), "utf8");

  assert.ok(source.includes("createLastGoodCardSnapshot"));
  assert.ok(source.includes("saveLastGoodCardSnapshot"));

  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "sendUds",
    "queueGattWrite",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "Driver_Activity_Data",
    "rawBytes",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside card result boundary");
  }
});
