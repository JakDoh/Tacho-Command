import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runAppV2LiveAttemptWithTelemetry } from "../lib/app-v2-technical-telemetry-bridge.js";

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

function deterministicCrypto() {
  return {
    randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
    getRandomValues(bytes) {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = index + 2;
      return bytes;
    },
  };
}

test("production App V2 telemetry posts only after the bounded LIVE transport is closed", async () => {
  let closed = false;
  let posted = null;

  const result = await runAppV2LiveAttemptWithTelemetry({
    cryptoImpl: deterministicCrypto(),
    openTransport: async () => ({
      deviceLabel: "DTCO 4.1a PRIVATE NAME",
      sendUds: workingSendUds(),
      close: async () => { closed = true; },
    }),
    postTelemetry: async (events) => {
      assert.equal(closed, true, "telemetry must post only after session teardown");
      posted = events;
      return { status: "accepted", accepted: events.length };
    },
    now: () => new Date("2026-09-19T09:05:00.000Z"),
  });

  assert.equal(result.status, "live");
  assert.match(result.attemptCode, /^TC-[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(result.telemetryStatus, "accepted");
  assert.equal(result.telemetryAcceptedCount, 9);
  assert.equal(result.telemetryEventCount, 9);
  assert.equal(posted.every((event) => event.attemptCode === result.attemptCode), true);
  assert.deepEqual(
    posted.filter((event) => event.event === "did_read").map((event) => event.did),
    ["F903", "F923", "F925", "F99A", "F99B"],
  );
  assert.equal(posted.some((event) => event.event === "snapshot_complete"), true);

  const serialized = JSON.stringify(posted);
  for (const forbidden of [
    "DTCO 4.1a PRIVATE NAME",
    "driverName",
    "cardNumber",
    "vehicleRegistration",
    "location",
    "bluetoothName",
    "rawBytes",
    "continuousDrivingSeconds",
    "cumulativeBreakSeconds",
    "dailyDrivingSeconds",
    "weeklyDrivingSeconds",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden + " must not be posted");
  }
});

test("optional null DID values are not misreported as successful telemetry", async () => {
  let posted = null;
  const sendUds = async (request) => {
    const did = (request[1] << 8) | request[2];
    if (did === 0xf903) return framedPositive(did, 0x00);
    if (did === 0xf923) return framedPositive(did, 0x00, 0x1e);
    if (did === 0xf925) return framedPositive(did, 0x00, 0x0f);
    return [1, 1, 0x7f, 0x22, 0x31];
  };

  const result = await runAppV2LiveAttemptWithTelemetry({
    cryptoImpl: deterministicCrypto(),
    openTransport: async () => ({ sendUds, close: async () => {} }),
    postTelemetry: async (events) => {
      posted = events;
      return { status: "accepted", accepted: events.length };
    },
  });

  assert.equal(result.status, "live");
  assert.deepEqual(
    posted.filter((event) => event.event === "did_read").map((event) => event.did),
    ["F903", "F923", "F925"],
  );
});

test("telemetry identity failure never blocks the LIVE read", async () => {
  const result = await runAppV2LiveAttemptWithTelemetry({
    cryptoImpl: {},
    openTransport: async () => ({
      sendUds: workingSendUds(),
      close: async () => {},
    }),
  });

  assert.equal(result.status, "live");
  assert.equal(result.attemptCode, null);
  assert.equal(result.telemetryStatus, "unavailable");
  assert.equal(result.telemetryAcceptedCount, null);
  assert.equal(result.telemetryEventCount, 0);
});

test("telemetry delivery failure never downgrades a verified LIVE result", async () => {
  const result = await runAppV2LiveAttemptWithTelemetry({
    cryptoImpl: deterministicCrypto(),
    openTransport: async () => ({
      sendUds: workingSendUds(),
      close: async () => {},
    }),
    postTelemetry: async () => ({ status: "network_unavailable", accepted: 0 }),
  });

  assert.equal(result.status, "live");
  assert.equal(result.session.phase, "live");
  assert.equal(result.telemetryStatus, "network_unavailable");
  assert.equal(result.telemetryAcceptedCount, null);
  assert.match(result.attemptCode, /^TC-/);
});

test("failed transport attempt still gets a support code without leaking the error text", async () => {
  let posted = null;
  const result = await runAppV2LiveAttemptWithTelemetry({
    cryptoImpl: deterministicCrypto(),
    openTransport: async () => {
      throw new Error("DTCO SECRET DEVICE driver Jane W-SECRET");
    },
    postTelemetry: async (events) => {
      posted = events;
      return { status: "accepted", accepted: events.length };
    },
  });

  assert.equal(result.status, "error");
  assert.equal(result.telemetryAcceptedCount, 2);
  assert.equal(posted[0].event, "connect_start");
  assert.equal(posted[1].event, "error");
  assert.equal(posted[1].phase, "bluetooth");
  assert.equal(posted[1].errorCode, "unknown");
  assert.equal(JSON.stringify(posted).includes("SECRET"), false);
  assert.equal(JSON.stringify(posted).includes("Jane"), false);
});

test("telemetry bridge stays outside Bluetooth, card transport and parser implementation", async () => {
  const source = await readFile(new URL("../lib/app-v2-technical-telemetry-bridge.js", import.meta.url), "utf8");
  assert.ok(source.includes("runAppV2FieldSession"));
  assert.ok(source.includes("postTechnicalTelemetry"));
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "writeValue",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "parseCanonical",
    "last-good-card-snapshot",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside telemetry bridge");
  }
});
