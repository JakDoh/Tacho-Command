import assert from "node:assert/strict";
import test from "node:test";

import { processAppV2ParsedCard } from "../lib/app-v2-card-pipeline.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test("card pipeline normalizes, validates and persists a complete parser result", () => {
  const storage = memoryStorage();
  const result = processAppV2ParsedCard({
    storage,
    capturedAtIso: "2026-09-19T09:25:00.000Z",
    parserResult: {
      complete: true,
      driverName: "Driver",
      cardLast4: "1234",
      slotLabel: "Driver 1",
      days: [{
        date: "2026-09-19",
        segments: [
          { activity: "rest", startMinute: 0, endMinute: 300, cardStatus: "not-inserted" },
          { activity: "work", startMinute: 300, endMinute: 330, cardStatus: "inserted" },
          { activity: "driving", startMinute: 330, endMinute: 420, cardStatus: "inserted" },
        ],
      }],
    },
  });

  assert.equal(result.status, "accepted");
  assert.equal(result.card.cardReadComplete, true);
  assert.equal(result.card.historyDays.length, 1);
  assert.equal(result.card.historyDays[0].drivingMinutes, 90);
  assert.equal(result.card.lastCardReadAtIso, "2026-09-19T09:25:00.000Z");
});

test("card pipeline rejects parser overlap before storage is touched", () => {
  let writes = 0;
  const storage = {
    getItem: () => null,
    setItem: () => { writes += 1; },
  };

  const result = processAppV2ParsedCard({
    storage,
    parserResult: {
      complete: true,
      days: [{
        date: "2026-09-19",
        segments: [
          { activity: "work", startMinute: 300, endMinute: 360, cardStatus: "inserted" },
          { activity: "driving", startMinute: 330, endMinute: 420, cardStatus: "inserted" },
        ],
      }],
    },
  });

  assert.equal(result.status, "rejected_parser_result");
  assert.equal(writes, 0);
});

test("card pipeline rejects incomplete parser results before storage is touched", () => {
  let writes = 0;
  const storage = {
    getItem: () => null,
    setItem: () => { writes += 1; },
  };

  const result = processAppV2ParsedCard({
    storage,
    parserResult: { complete: false, days: [] },
  });

  assert.equal(result.status, "rejected_parser_result");
  assert.equal(writes, 0);
});
