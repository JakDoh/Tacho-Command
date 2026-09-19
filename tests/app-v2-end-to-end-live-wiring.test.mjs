import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFieldProvenProductState } from "../lib/field-proven-product-state.js";

test("confirmed live snapshot remains visible after bounded transport teardown without claiming active LIVE", () => {
  const state = createFieldProvenProductState({
    live: {
      connected: false,
      snapshotConfirmed: true,
      activity: "drive",
      continuousDrivingSec: 3600,
      dailyDrivingSec: 7200,
      weeklyDrivingSec: 14400,
      lastLiveReadLabel: "11:05",
    },
  });

  assert.equal(state.live, false);
  assert.equal(state.liveSnapshotAvailable, true);
  assert.equal(state.currentActivity, "DRIVING");
  assert.equal(state.continuousDrivingMinutes, 60);
  assert.equal(state.todayDrivingMinutes, 120);
  assert.equal(state.weekDrivingMinutes, 240);
});

test("app v2 wires the browser transport factory through the telemetry bridge and field lifecycle", async () => {
  const client = await readFile(new URL("../app/app-v2/app-v2-client.tsx", import.meta.url), "utf8");
  const bridge = await readFile(new URL("../lib/app-v2-technical-telemetry-bridge.js", import.meta.url), "utf8");
  assert.ok(client.includes("openBrowserAppV2FieldTransport"));
  assert.ok(client.includes("runAppV2LiveAttemptWithTelemetry"));
  assert.ok(bridge.includes("runAppV2FieldSession"));
  assert.ok(client.includes("Poveži i očitaj LIVE"));
  assert.ok(client.includes("snapshotConfirmed: true"));
  assert.ok(client.includes("Poslednje LIVE očitavanje potvrđeno"));

  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "getPrimaryServices",
    "createUdsResponseCollector",
    "queueWrite(",
  ]) {
    assert.equal(client.includes(forbidden), false, forbidden + " must stay outside the App V2 client");
  }
});

test("premium UI distinguishes active LIVE from the last confirmed snapshot", async () => {
  const ui = await readFile(new URL("../app/app/field-proven-premium-ui.tsx", import.meta.url), "utf8");
  assert.ok(ui.includes("POSLEDNJE POTVRĐENO OČITAVANJE"));
  assert.ok(ui.includes("state.liveSnapshotAvailable"));
  assert.ok(ui.includes("aktivna veza je završena"));
});
