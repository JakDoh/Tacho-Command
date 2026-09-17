import assert from "node:assert/strict";
import test from "node:test";
import { postTechnicalTelemetry } from "../lib/technical-telemetry-client.js";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";

const validEvent = {
  sessionId,
  event: "did_read",
  phase: "live_read",
  outcome: "positive",
  did: "F903",
  durationMs: 125,
  deviceFamily: "unknown",
};

test("client transport sanitizes before sending and never forwards extra fields", async () => {
  let posted = null;
  const result = await postTechnicalTelemetry(
    [{ ...validEvent, driverName: "secret", rawBytes: [1, 2], actualValue: 999 }],
    {
      fetchImpl: async (_url, init) => {
        posted = JSON.parse(init.body);
        return { status: 202, json: async () => ({ status: "accepted", accepted: 1 }) };
      },
    },
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.accepted, 1);
  assert.equal(posted.events.length, 1);
  assert.equal(posted.events[0].driverName, undefined);
  assert.equal(posted.events[0].rawBytes, undefined);
  assert.equal(posted.events[0].actualValue, undefined);
});

test("client transport reports storage unavailable without throwing", async () => {
  const result = await postTechnicalTelemetry([validEvent], {
    fetchImpl: async () => ({
      status: 503,
      json: async () => ({ status: "storage_unavailable" }),
    }),
  });
  assert.deepEqual(result, { status: "storage_unavailable", accepted: 0 });
});

test("client transport reports network failure without throwing", async () => {
  const result = await postTechnicalTelemetry([validEvent], {
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  assert.deepEqual(result, { status: "network_unavailable", accepted: 0 });
});

test("client transport refuses an empty invalid batch without any fetch", async () => {
  let called = false;
  const result = await postTechnicalTelemetry([{ event: "did_read" }], {
    fetchImpl: async () => {
      called = true;
      throw new Error("should not run");
    },
  });
  assert.deepEqual(result, { status: "no_valid_events", accepted: 0 });
  assert.equal(called, false);
});
