import assert from "node:assert/strict";
import test from "node:test";
import { postTechnicalTelemetry, flushQueuedTechnicalTelemetry } from "../lib/technical-telemetry-client.js";

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

test("offline terminal report is sanitized, retained and delivered on reconnection", async () => {
 const entries=new Map();
 const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};
 const failed={...validEvent,event:"card_transfer_error",phase:"card_transfer",outcome:"error",attemptCode:"TC-ABCDEF",packetCount:135,errorCode:"packet_idle_timeout",driverName:"secret"};
 await postTechnicalTelemetry([failed],{storage,fetchImpl:async()=>{throw new Error("offline");}});
 assert.equal(JSON.stringify([...entries.values()]).includes("secret"),false);
 let sent;
 const count=await flushQueuedTechnicalTelemetry({storage,fetchImpl:async(_url,init)=>{sent=JSON.parse(init.body);return {status:202,json:async()=>({status:"accepted",accepted:1})};}});
 assert.equal(count,1);
 assert.equal(sent.events[0].packetCount,135);
 assert.equal(sent.events[0].errorCode,"packet_idle_timeout");
 assert.equal(JSON.parse([...entries.values()][0]).length,0);
});
