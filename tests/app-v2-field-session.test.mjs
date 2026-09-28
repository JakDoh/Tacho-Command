import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runAppV2FieldSession } from "../lib/app-v2-field-session.js";

const framedPositive = (did, ...data) => [1, 1, 0x62, (did >> 8) & 0xff, did & 0xff, ...data];

function workingSendUds() {
  const replies = new Map([
    [0xf903, framedPositive(0xf903, 0x03)],
    [0xf923, framedPositive(0xf923, 0x00, 0x3c)],
    [0xf925, framedPositive(0xf925, 0x00, 0x0f)],
    [0xf99a, framedPositive(0xf99a, 0x01, 0x2c)],
    [0xf99b, framedPositive(0xf99b, 0x05, 0xdc)],
  ]);
  return async (request) => replies.get((request[1] << 8) | request[2]) ?? null;
}

test("field session opens, reads through the injected transport and closes cleanly", async () => {
  let opened = 0;
  let closed = 0;

  const result = await runAppV2FieldSession({
    openTransport: async () => {
      opened += 1;
      return {
        deviceLabel: "DTCO 4.1a",
        sendUds: workingSendUds(),
        close: async () => { closed += 1; },
      };
    },
    attemptCode: "TC-ABC123",
    now: () => new Date("2026-09-19T09:05:00.000Z"),
  });

  assert.equal(opened, 1);
  assert.equal(closed, 1);
  assert.equal(result.status, "live");
  assert.equal(result.session.phase, "live");
  assert.equal(result.session.productLive.deviceLabel, "DTCO 4.1a");
});

test("field session always closes transport when live read throws", async () => {
  let closed = 0;

  const result = await runAppV2FieldSession({
    openTransport: async () => ({
      sendUds: async () => { throw new Error("read failed"); },
      close: async () => { closed += 1; },
    }),
  });

  assert.equal(closed, 1);
  assert.equal(result.status, "error");
  assert.equal(result.session.phase, "error");
});

test("field session rejects a transport without sendUds and still runs fallback teardown", async () => {
  let closed = 0;

  const result = await runAppV2FieldSession({
    openTransport: async () => ({ deviceLabel: "DTCO" }),
    closeTransport: async () => { closed += 1; },
  });

  assert.equal(result.status, "error");
  assert.match(result.session.errorText, /sendUds/);
  assert.equal(closed, 1);
});

test("teardown failure never overwrites the verified live result", async () => {
  const result = await runAppV2FieldSession({
    openTransport: async () => ({
      sendUds: workingSendUds(),
      close: async () => { throw new Error("close failed"); },
    }),
  });

  assert.equal(result.status, "live");
  assert.equal(result.session.phase, "live");
});

test("field session retains a stationary transport while mandatory LIVE data is incomplete", async () => {
  let closed = 0;
  const sendUds = workingSendUds();
  const result = await runAppV2FieldSession({
    openTransport: async () => ({
      deviceLabel: "DTCO incomplete",
      sendUds: async (request) => {
        const did = (request[1] << 8) | request[2];
        if (did === 0xf923) return null;
        return sendUds(request);
      },
      isConnected: () => true,
      close: async () => { closed += 1; },
    }),
    keepTransportOpen: true,
  });

  assert.equal(result.status, "incomplete");
  assert.ok(result.transport);
  assert.equal(closed, 0);
  await result.transport.close();
  assert.equal(closed, 1);
});

test("field session owns lifecycle only, not Bluetooth or UDS framing", async () => {
  const source = await readFile(new URL("../lib/app-v2-field-session.js", import.meta.url), "utf8");
  assert.ok(source.includes("openTransport"));
  assert.ok(source.includes("runAppV2FieldLiveRead"));
  assert.ok(source.includes("finally"));
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "getPrimaryServices",
    "writeValue",
    "queueGattWrite",
    "createUdsResponseCollector",
    "buildReadDataByIdentifier",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "postTechnicalTelemetry",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside the lifecycle");
  }
});
