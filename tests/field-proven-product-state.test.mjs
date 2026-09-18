import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createFieldProvenLiveSnapshot,
  createFieldProvenProductState,
} from "../lib/field-proven-product-state.js";

const uiSource = await readFile(
  new URL("../app/app/field-proven-premium-ui.tsx", import.meta.url),
  "utf8",
);
const adapterSource = await readFile(
  new URL("../lib/field-proven-product-state.js", import.meta.url),
  "utf8",
);

test("adapter maps proven LIVE snapshot values without inventing data", () => {
  const state = createFieldProvenProductState({
    live: {
      connected: true,
      deviceLabel: "SYNTH-TACHO",
      lastLiveReadLabel: "06:02",
      activity: "rest",
      continuousDrivingSec: 3600,
      dailyDrivingSec: 7200,
      weeklyDrivingSec: 18000,
      telemetryAcceptedCount: 6,
      attemptCode: "TC-7F2K8M",
    },
    profile: {
      continuousThresholdMinutes: 270,
      continuousWarningMinutes: 255,
    },
  });

  assert.equal(state.live, true);
  assert.equal(state.currentActivity, "REST");
  assert.equal(state.continuousDrivingMinutes, 60);
  assert.equal(state.todayDrivingMinutes, 120);
  assert.equal(state.weekDrivingMinutes, 300);
  assert.equal(state.continuousThresholdLabel, "4 h 30 min");
  assert.equal(state.continuousRemainingLabel, "3 h 30 min");
  assert.equal(state.continuousBand, "safe");
  assert.equal(state.telemetrySentCount, 6);
  assert.equal(state.attemptCode, "TC-7F2K8M");
});

test("adapter stays neutral when no rule/profile threshold is supplied", () => {
  const state = createFieldProvenProductState({
    live: { connected: true, continuousDrivingSec: 3600, activity: "driving" },
  });

  assert.equal(state.continuousProgressPercent, null);
  assert.equal(state.continuousRemainingLabel, null);
  assert.equal(state.continuousThresholdLabel, null);
  assert.equal(state.continuousBand, "neutral");
});

test("adapter maps parsed card history into display percentages without parsing raw card bytes", () => {
  const state = createFieldProvenProductState({
    card: {
      driverName: "Synthetic Driver",
      cardLast4: "1234",
      cardReadComplete: true,
      historyDaysAvailable: 56,
      fortnightDrivingMinutes: 1200,
      historyDays: [
        {
          dateLabel: "18. sep",
          drivingMinutes: 120,
          segments: [
            { kind: "drive", minutes: 120 },
            { kind: "work", minutes: 60 },
            { kind: "rest", minutes: 1260 },
          ],
        },
      ],
    },
  });

  assert.equal(state.cardReadComplete, true);
  assert.equal(state.historyDaysAvailable, 56);
  assert.equal(state.historyDays.length, 1);
  assert.equal(state.historyDays[0].segments.length, 3);
  assert.deepEqual(state.historyDays[0].activityTotals, {
    drive: 120,
    work: 60,
    availability: 0,
    rest: 1260,
  });
  assert.equal(state.historyDays[0].segments[0].minutes, 120);
  assert.equal(state.historyDays[0].segments[0].startMinute, 0);
  assert.equal(state.historyDays[0].segments[0].endMinute, 120);
  const total = state.historyDays[0].segments.reduce((sum, segment) => sum + segment.percent, 0);
  assert.ok(Math.abs(total - 100) < 0.000001);
});

test("adapter preserves absolute daily positions and card events for day detail", () => {
  const state = createFieldProvenProductState({
    card: {
      cardReadComplete: true,
      historyDaysAvailable: 1,
      historyDays: [
        {
          dateLabel: "18. sep",
          drivingMinutes: 90,
          events: [
            { kind: "card-inserted", minute: 287 },
            { kind: "card-removed", minute: 910 },
          ],
          segments: [
            { kind: "rest", minutes: 287, startMinute: 0, endMinute: 287, cardStatus: "not-inserted" },
            { kind: "work", minutes: 11, startMinute: 287, endMinute: 298, cardStatus: "inserted", label: "Provera vozila" },
            { kind: "drive", minutes: 90, startMinute: 298, endMinute: 388, cardStatus: "inserted" },
            { kind: "rest", minutes: 522, startMinute: 388, endMinute: 910, cardStatus: "inserted" },
            { kind: "rest", minutes: 530, startMinute: 910, endMinute: 1440, cardStatus: "not-inserted" },
          ],
        },
      ],
    },
  });

  const day = state.historyDays[0];
  assert.deepEqual(day.events.map((event) => [event.kind, event.minute]), [
    ["card-inserted", 287],
    ["card-removed", 910],
  ]);
  assert.equal(day.segments[1].label, "Provera vozila");
  assert.equal(day.segments[1].startMinute, 287);
  assert.equal(day.segments[1].endMinute, 298);
});

test("adapter bounds support-code and identity display fields", () => {
  const live = createFieldProvenLiveSnapshot({
    connected: true,
    attemptCode: "Boban Canic",
    deviceLabel: "  Synthetic device  ",
  });
  const state = createFieldProvenProductState({
    live,
    card: { cardLast4: "xx-9876", driverName: " Synthetic Driver " },
  });

  assert.equal(state.attemptCode, null);
  assert.equal(state.tachographLabel, "Synthetic device");
  assert.equal(state.cardLast4, "9876");
  assert.equal(state.driverName, "Synthetic Driver");
});

test("adapter source is a pure state boundary and cannot issue tachograph or telemetry writes", () => {
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "writeValue",
    "writeValueWithoutResponse",
    "postTechnicalTelemetry",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
  ]) {
    assert.equal(adapterSource.includes(forbidden), false, forbidden + " must stay outside adapter");
  }
});

test("premium UI consumes the shared state contract and no longer hard-codes 4:30", () => {
  assert.match(uiSource, /import type \{[^}]*FieldProvenProductState[^}]*\}/);
  assert.match(uiSource, /continuousThresholdLabel/);
  assert.equal(uiSource.includes("<span>4:30</span>"), false);
});
