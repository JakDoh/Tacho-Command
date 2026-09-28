import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runAppV2FieldLiveRead } from "../lib/app-v2-field-live-adapter.js";

const framedPositive = (did, ...data) => [1, 1, 0x62, (did >> 8) & 0xff, did & 0xff, ...data];

test("field live adapter turns verified RDBI replies into an App V2 live session", async () => {
  const replies = new Map([
    [0xf903, framedPositive(0xf903, 0x03)],
    [0xf923, framedPositive(0xf923, 0x00, 0x3c)],
    [0xf925, framedPositive(0xf925, 0x00, 0x0f)],
    [0xf99a, framedPositive(0xf99a, 0x01, 0x2c)],
    [0xf99b, framedPositive(0xf99b, 0x05, 0xdc)],
  ]);

  const sendUds = async (request) => {
    const did = (request[1] << 8) | request[2];
    return replies.get(did) ?? null;
  };

  const result = await runAppV2FieldLiveRead({
    sendUds,
    deviceLabel: "DTCO",
    attemptCode: "TC-ABC123",
    now: () => new Date("2026-09-19T09:05:00.000Z"),
  });

  assert.equal(result.status, "live");
  assert.equal(result.session.phase, "live");
  assert.equal(result.session.productLive.connected, true);
  assert.equal(result.session.productLive.activity, "DRIVING");
  assert.equal(result.session.productLive.continuousDrivingSec, 3600);
  assert.equal(result.session.productLive.dailyDrivingSec, 300 * 60);
  assert.equal(result.session.productLive.weeklyDrivingSec, 1500 * 60);
});

test("field live adapter keeps optional daily and weekly values nullable", async () => {
  const sendUds = async (request) => {
    const did = (request[1] << 8) | request[2];
    if (did === 0xf903) return framedPositive(did, 0x00);
    if (did === 0xf923) return framedPositive(did, 0x00, 0x1e);
    if (did === 0xf925) return framedPositive(did, 0x00, 0x0f);
    return [1, 1, 0x7f, 0x22, 0x31];
  };

  const result = await runAppV2FieldLiveRead({ sendUds });

  assert.equal(result.status, "live");
  assert.equal(result.session.productLive.dailyDrivingSec, null);
  assert.equal(result.session.productLive.weeklyDrivingSec, null);
});

test("field live adapter retries one invalid F903 frame before confirming REST", async () => {
  let activityReads = 0;
  const sendUds = async (request) => {
    const did = (request[1] << 8) | request[2];
    if (did === 0xf903) {
      activityReads += 1;
      return activityReads === 1 ? framedPositive(did, 0x04) : framedPositive(did, 0x00);
    }
    if (did === 0xf923 || did === 0xf925) return framedPositive(did, 0x00, 0x00);
    return [1, 1, 0x7f, 0x22, 0x31];
  };

  const result = await runAppV2FieldLiveRead({ sendUds });

  assert.equal(activityReads, 2);
  assert.equal(result.status, "live");
  assert.equal(result.session.productLive.activity, "REST");
});

test("field live adapter fails closed when mandatory telemetry is missing", async () => {
  const sendUds = async (request) => {
    const did = (request[1] << 8) | request[2];
    if (did === 0xf903) return framedPositive(did, 0x03);
    if (did === 0xf925) return framedPositive(did, 0x00, 0x0f);
    return null;
  };

  const result = await runAppV2FieldLiveRead({ sendUds });

  assert.equal(result.status, "incomplete");
  assert.equal(result.session.phase, "error");
  assert.equal(result.session.productLive.connected, false);
});

test("field live adapter converts thrown transport errors into a stable error session", async () => {
  const result = await runAppV2FieldLiveRead({
    sendUds: async () => {
      throw new Error("transport lost");
    },
  });

  assert.equal(result.status, "error");
  assert.equal(result.session.phase, "error");
  assert.match(result.session.errorText, /transport lost/);
});

test("field live adapter injects transport and contains no Bluetooth implementation", async () => {
  const source = await readFile(new URL("../lib/app-v2-field-live-adapter.js", import.meta.url), "utf8");
  assert.ok(source.includes("readCoreDriverTelemetry"));
  assert.ok(source.includes("sendUds"));
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "getPrimaryServices",
    "writeValue",
    "writeValueWithoutResponse",
    "queueGattWrite",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "postTechnicalTelemetry",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside the App V2 adapter");
  }
});
