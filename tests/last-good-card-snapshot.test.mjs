import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFieldProvenProductState } from "../lib/field-proven-product-state.js";
import {
  LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY,
  cardStateFromLastGoodCardSnapshot,
  createLastGoodCardSnapshot,
  loadLastGoodCardSnapshot,
  saveLastGoodCardSnapshot,
} from "../lib/last-good-card-snapshot.js";

function memoryStorage(initial = null) {
  const data = new Map();
  if (initial !== null) data.set(LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY, initial);
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    raw() {
      return data.get(LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY) ?? null;
    },
  };
}

function completeCard(overrides = {}) {
  return {
    driverName: "Synthetic Driver",
    cardLast4: "1234",
    cardReadComplete: true,
    historyDaysAvailable: 2,
    fortnightDrivingMinutes: 180,
    historyDays: [
      {
        dateIso: "2026-09-17",
        dateLabel: "17. sep",
        drivingMinutes: 120,
        segments: [
          { kind: "drive", minutes: 120 },
          { kind: "rest", minutes: 1320 },
        ],
      },
      {
        dateIso: "2026-09-18",
        dateLabel: "18. sep",
        drivingMinutes: 60,
        segments: [
          { kind: "drive", minutes: 60 },
          { kind: "work", minutes: 30 },
          { kind: "rest", minutes: 1350 },
        ],
      },
    ],
    slotLabel: "Vozač 1 · Slot 1",
    ...overrides,
  };
}

test("complete card read creates a versioned last-good snapshot with timestamp and range", () => {
  const snapshot = createLastGoodCardSnapshot(
    completeCard(),
    "2026-09-18T06:02:00+02:00",
  );

  assert.ok(snapshot);
  assert.equal(snapshot.schema, "tc-card-snapshot-v1");
  assert.equal(snapshot.capturedAtIso, "2026-09-18T04:02:00.000Z");
  assert.equal(snapshot.card.historyRangeStartIso, "2026-09-17");
  assert.equal(snapshot.card.historyRangeEndIso, "2026-09-18");
  assert.equal(snapshot.card.historyDays.length, 2);
});

test("incomplete or malformed new read never overwrites the previous good snapshot", () => {
  const storage = memoryStorage();
  const first = saveLastGoodCardSnapshot(
    storage,
    completeCard(),
    "2026-09-18T06:02:00+02:00",
  );
  assert.equal(first.status, "saved");
  const before = storage.raw();

  const rejected = saveLastGoodCardSnapshot(
    storage,
    completeCard({ cardReadComplete: false }),
    "2026-09-18T12:00:00+02:00",
  );

  assert.equal(rejected.status, "rejected_incomplete");
  assert.equal(storage.raw(), before);
});

test("successful newer read atomically replaces the one stored snapshot", () => {
  const storage = memoryStorage();
  saveLastGoodCardSnapshot(storage, completeCard(), "2026-09-18T06:02:00+02:00");

  const newer = saveLastGoodCardSnapshot(
    storage,
    completeCard({
      historyDaysAvailable: 1,
      fortnightDrivingMinutes: 75,
      historyDays: [
        {
          dateIso: "2026-09-19",
          dateLabel: "19. sep",
          drivingMinutes: 75,
          segments: [
            { kind: "drive", minutes: 75 },
            { kind: "rest", minutes: 1365 },
          ],
        },
      ],
    }),
    "2026-09-19T07:15:00+02:00",
  );

  assert.equal(newer.status, "saved");
  const loaded = loadLastGoodCardSnapshot(storage);
  assert.equal(loaded.capturedAtIso, "2026-09-19T05:15:00.000Z");
  assert.equal(loaded.card.historyRangeEndIso, "2026-09-19");
  assert.equal(loaded.card.historyDays.length, 1);
});

test("stored snapshot can feed the existing product-state adapter after restart", () => {
  const storage = memoryStorage();
  saveLastGoodCardSnapshot(storage, completeCard(), "2026-09-18T06:02:00+02:00");

  const loaded = loadLastGoodCardSnapshot(storage);
  const card = cardStateFromLastGoodCardSnapshot(loaded);
  const state = createFieldProvenProductState({ card });

  assert.equal(state.driverName, "Synthetic Driver");
  assert.equal(state.cardLast4, "1234");
  assert.equal(state.cardReadComplete, true);
  assert.equal(state.historyDaysAvailable, 2);
  assert.equal(state.historyDays.length, 2);
});

test("snapshot preserves day-detail positions, labels and card events", () => {
  const storage = memoryStorage();
  const card = completeCard({
    historyDaysAvailable: 1,
    historyDays: [
      {
        dateIso: "2026-09-18",
        dateLabel: "18. sep",
        drivingMinutes: 90,
        events: [
          { kind: "card-inserted", minute: 287 },
          { kind: "card-removed", minute: 910 },
        ],
        segments: [
          { kind: "work", minutes: 11, startMinute: 287, endMinute: 298, cardStatus: "inserted", label: "Provera vozila" },
          { kind: "drive", minutes: 90, startMinute: 298, endMinute: 388, cardStatus: "inserted" },
        ],
      },
    ],
  });

  assert.equal(saveLastGoodCardSnapshot(storage, card, "2026-09-18T06:02:00+02:00").status, "saved");
  const loaded = loadLastGoodCardSnapshot(storage);
  assert.deepEqual(loaded.card.historyDays[0].events.map((event) => [event.kind, event.minute]), [
    ["card-inserted", 287],
    ["card-removed", 910],
  ]);
  assert.equal(loaded.card.historyDays[0].segments[0].startMinute, 287);
  assert.equal(loaded.card.historyDays[0].segments[0].endMinute, 298);
  assert.equal(loaded.card.historyDays[0].segments[0].cardStatus, "inserted");
  assert.equal(loaded.card.historyDays[0].segments[0].label, "Provera vozila");
});

test("corrupt or unknown-version storage fails closed without inventing history", () => {
  assert.equal(loadLastGoodCardSnapshot(memoryStorage("{broken-json")), null);
  assert.equal(
    loadLastGoodCardSnapshot(memoryStorage(JSON.stringify({
      schema: "tc-card-snapshot-v999",
      capturedAtIso: "2026-09-18T04:02:00.000Z",
      card: completeCard(),
    }))),
    null,
  );
});

test("snapshot source contains no transport, parser, telemetry or server write path", async () => {
  const source = await readFile(new URL("../lib/last-good-card-snapshot.js", import.meta.url), "utf8");
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "writeValue",
    "writeValueWithoutResponse",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "postTechnicalTelemetry",
    "/api/",
    "fetch(",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside snapshot storage");
  }
});
