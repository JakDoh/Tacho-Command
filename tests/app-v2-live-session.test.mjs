import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  appV2LiveSessionFromTelemetry,
  createAppV2LiveSession,
  transitionAppV2LiveSession,
} from "../lib/app-v2-live-session.js";

test("app v2 live session follows the explicit happy path", () => {
  let session = createAppV2LiveSession();
  assert.equal(session.phase, "idle");
  assert.equal(session.canConnect, true);

  session = transitionAppV2LiveSession(session, "connecting");
  assert.ok(session);
  session = transitionAppV2LiveSession(session, "transport-ready", { deviceLabel: "DTCO" });
  assert.ok(session);
  session = transitionAppV2LiveSession(session, "reading");
  assert.ok(session);
  session = transitionAppV2LiveSession(session, "live", {
    telemetry: {
      activity: "drive",
      continuousDrivingSeconds: 3600,
      dailyDrivingSeconds: 7200,
      weeklyDrivingSeconds: 14400,
    },
  });

  assert.ok(session);
  assert.equal(session.phase, "live");
  assert.equal(session.connected, true);
  assert.equal(session.productLive.activity, "DRIVING");
  assert.equal(session.productLive.continuousDrivingSec, 3600);
});

test("app v2 live session rejects impossible jumps", () => {
  const idle = createAppV2LiveSession();
  assert.equal(transitionAppV2LiveSession(idle, "live"), null);
  assert.equal(transitionAppV2LiveSession(idle, "reading"), null);
});

test("app v2 live session fails closed when mandatory telemetry is incomplete", () => {
  const session = appV2LiveSessionFromTelemetry({
    telemetry: {
      activityValid: true,
      activity: "drive",
      continuousDrivingSeconds: null,
      cumulativeBreakSeconds: 900,
    },
  });

  assert.equal(session.phase, "error");
  assert.equal(session.connected, false);
  assert.match(session.errorText, /Obavezni LIVE podaci nisu potvrđeni/);
});

test("app v2 live session boundary contains no Bluetooth or transport implementation", async () => {
  const source = await readFile(new URL("../lib/app-v2-live-session.js", import.meta.url), "utf8");
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "writeValue",
    "queueGattWrite",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "postTechnicalTelemetry",
    "fetch(",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside live session boundary");
  }
});
