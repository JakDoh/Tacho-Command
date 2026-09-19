import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeParserCardResult } from "../lib/app-v2-parser-card-adapter.js";

test("parser card adapter normalizes ordered parser-native segments and derives card totals", () => {
  const result = normalizeParserCardResult({
    complete: true,
    driverName: "Driver",
    cardLast4: "1234",
    slotLabel: "Driver 1",
    days: [{
      date: "2026-09-18",
      dateLabel: "18.09.",
      segments: [
        { activity: "rest", startMinute: 0, endMinute: 300, cardStatus: "not-inserted" },
        { activity: "work", startMinute: 300, endMinute: 330, cardStatus: "inserted" },
        { activity: "driving", startMinute: 330, endMinute: 420, cardStatus: "inserted" },
        { activity: "availability", startMinute: 420, endMinute: 450, cardStatus: "inserted" },
      ],
    }],
  });

  assert.ok(result);
  assert.equal(result.cardReadComplete, true);
  assert.equal(result.historyDaysAvailable, 1);
  assert.equal(result.fortnightDrivingMinutes, 90);
  assert.equal(result.historyDays[0].segments[2].kind, "drive");
  assert.equal(result.historyDays[0].segments[2].minutes, 90);
  assert.deepEqual(result.historyDays[0].events, [{ kind: "card-inserted", minute: 300 }]);
});

test("parser card adapter rejects duplicate-minute overlap instead of silently merging it", () => {
  const result = normalizeParserCardResult({
    complete: true,
    days: [{
      date: "2026-09-18",
      segments: [
        { activity: "work", startMinute: 300, endMinute: 360, cardStatus: "inserted" },
        { activity: "driving", startMinute: 330, endMinute: 420, cardStatus: "inserted" },
      ],
    }],
  });

  assert.equal(result, null);
});

test("parser card adapter rejects duplicate dates and incomplete parser results", () => {
  assert.equal(normalizeParserCardResult({ complete: false, days: [] }), null);

  const duplicate = normalizeParserCardResult({
    complete: true,
    days: [
      { date: "2026-09-18", segments: [] },
      { date: "2026-09-18", segments: [] },
    ],
  });

  assert.equal(duplicate, null);
});

test("parser card adapter keeps only the latest 56 normalized days", () => {
  const start = Date.parse("2026-07-01T00:00:00.000Z");
  const days = Array.from({ length: 70 }, (_, index) => ({
    date: new Date(start + index * 86400000).toISOString().slice(0, 10),
    segments: [{ activity: "driving", startMinute: 60, endMinute: 120, cardStatus: "inserted" }],
  }));

  const result = normalizeParserCardResult({ complete: true, days });

  assert.ok(result);
  assert.equal(result.historyDaysAvailable, 56);
  assert.equal(result.historyDays.length, 56);
  assert.equal(result.fortnightDrivingMinutes, 14 * 60);
  assert.equal(result.historyRangeEndIso, days.at(-1).date);
});

test("parser card adapter contains no raw transport or DDD parser implementation", async () => {
  const source = await readFile(new URL("../lib/app-v2-parser-card-adapter.js", import.meta.url), "utf8");

  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "sendUds",
    "queueGattWrite",
    "parseDddTlv",
    "Driver_Activity_Data",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside parser card adapter");
  }
});
