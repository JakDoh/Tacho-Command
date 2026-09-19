import assert from "node:assert/strict";
import test from "node:test";

import { parseAppV2CardPayload } from "../lib/app-v2-canonical-card-parser.js";

const be16 = (value) => [(value >> 8) & 0xff, value & 0xff];
const be32 = (value) => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

const changeWord = ({ slot = 0, status = 0, card = 0, activity = 0, minute = 0 }) =>
  ((slot & 1) << 15) |
  ((status & 1) << 14) |
  ((card & 1) << 13) |
  ((activity & 3) << 11) |
  (minute & 0x07ff);

function dailyRecord({ previous = 0, date = "2026-09-19", changes }) {
  const epoch = Math.floor(Date.parse(date + "T00:00:00Z") / 1000);
  const length = 12 + changes.length * 2;
  return Uint8Array.from([
    ...be16(previous),
    ...be16(length),
    ...be32(epoch),
    0x00, 0x01,
    0x00, 0x00,
    ...changes.flatMap((word) => be16(word)),
  ]);
}

function tlv(tagBytes, value) {
  return Uint8Array.from([
    ...tagBytes,
    ...be16(value.length),
    ...value,
  ]);
}

function driverActivityPayload(record, tagBytes = [0x05, 0x04, 0x02]) {
  const buffer = new Uint8Array(Math.max(64, record.length + 8));
  buffer.set(record, 0);
  const block = Uint8Array.from([
    ...be16(0),
    ...be16(0),
    ...buffer,
  ]);
  return tlv(tagBytes, block);
}

test("canonical parser converts strict Gen2 activity data into parser-native days", () => {
  const record = dailyRecord({
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 2, minute: 300 }),
      changeWord({ activity: 3, minute: 330 }),
    ],
  });

  const result = parseAppV2CardPayload(driverActivityPayload(record));

  assert.equal(result.complete, true);
  assert.equal(result.generation, "gen2");
  assert.equal(result.sourceTag, "050402");
  assert.equal(result.days.length, 1);
  assert.deepEqual(result.days[0].segments.map((segment) => [
    segment.activity,
    segment.startMinute,
    segment.endMinute,
  ]), [
    ["rest", 0, 300],
    ["work", 300, 330],
    ["driving", 330, 1440],
  ]);
});

test("canonical parser rejects duplicate-minute activity changes before segments are built", () => {
  const record = dailyRecord({
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 2, minute: 300 }),
      changeWord({ activity: 3, minute: 300 }),
    ],
  });

  assert.throws(
    () => parseAppV2CardPayload(driverActivityPayload(record)),
    /Duplicate or non-monotonic activity minute/,
  );
});

test("canonical parser rejects decreasing activity minutes", () => {
  const record = dailyRecord({
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 3, minute: 400 }),
      changeWord({ activity: 2, minute: 350 }),
    ],
  });

  assert.throws(
    () => parseAppV2CardPayload(driverActivityPayload(record)),
    /Duplicate or non-monotonic activity minute/,
  );
});

test("canonical parser prefers Gen2 Driver_Activity_Data when both generations exist", () => {
  const gen1Record = dailyRecord({
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 2, minute: 200 }),
    ],
  });
  const gen2Record = dailyRecord({
    changes: [
      changeWord({ activity: 0, minute: 0 }),
      changeWord({ activity: 3, minute: 600 }),
    ],
  });

  const payload = Uint8Array.from([
    ...driverActivityPayload(gen1Record, [0x05, 0x04, 0x00]),
    ...driverActivityPayload(gen2Record, [0x05, 0x04, 0x02]),
  ]);

  const result = parseAppV2CardPayload(payload);

  assert.equal(result.generation, "gen2");
  assert.equal(result.sourceTag, "050402");
  assert.equal(result.days[0].segments[1].activity, "driving");
});

test("canonical parser rejects payloads without Driver_Activity_Data", () => {
  const payload = tlv([0x05, 0x01, 0x02], Uint8Array.from([1, 2, 3]));

  assert.throws(
    () => parseAppV2CardPayload(payload),
    /Driver_Activity_Data TLV not found/,
  );
});
