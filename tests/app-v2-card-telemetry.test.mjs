import assert from "node:assert/strict";
import test from "node:test";
import { createAppV2CardTelemetry } from "../lib/app-v2-card-telemetry.js";
import { sanitizeTechnicalTelemetryBatch } from "../lib/technical-telemetry.js";

const cryptoImpl = {
  randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
  getRandomValues: (bytes) => {
    bytes.fill(1);
    return bytes;
  },
};

test("card black box reports the last confirmed packet without identity or raw payload", async () => {
  let posted = null;
  let now = 1000;
  const telemetry = createAppV2CardTelemetry({
    cryptoImpl,
    now: () => now,
    postTelemetry: async (events) => {
      posted = sanitizeTechnicalTelemetryBatch(events);
      return { status: "accepted", accepted: posted.length };
    },
  });

  telemetry.progress({ submessages: 79, byteLength: 19_829, complete: false });
  now = 2500;
  telemetry.transportError(new Error("VU je zatvorio flow-control"));
  const result = await telemetry.finish({ status: "read_error" });

  assert.equal(result.status, "accepted");
  assert.equal(telemetry.attemptCode, "TC-BBBBBB");
  assert.equal(posted.length, 2);
  assert.deepEqual(
    posted.map(({ event, phase, outcome, errorCode, packetCount, byteCount }) => ({
      event, phase, outcome, errorCode, packetCount, byteCount,
    })),
    [
      { event: "card_read_start", phase: "card_transport", outcome: "start", errorCode: null, packetCount: 0, byteCount: 0 },
      { event: "card_transfer_error", phase: "card_transfer", outcome: "error", errorCode: "peer_closed", packetCount: 79, byteCount: 19_829 },
    ],
  );
  assert.equal(JSON.stringify(posted).includes("VU je zatvorio"), false);
});
test("card black box records a complete transport and accepted pipeline", async () => {
  let posted = null;
  const telemetry = createAppV2CardTelemetry({
    cryptoImpl,
    postTelemetry: async (events) => {
      posted = sanitizeTechnicalTelemetryBatch(events);
      return { status: "accepted", accepted: posted.length };
    },
  });
  telemetry.progress({ submessages: 269, byteLength: 67_295, complete: true });
  telemetry.transportComplete();
  await telemetry.finish({ status: "accepted" });

  assert.deepEqual(posted.map((item) => item.event), [
    "card_read_start",
    "card_transfer_complete",
    "card_pipeline_complete",
  ]);
  assert.equal(posted.at(-1).packetCount, 269);
  assert.equal(posted.at(-1).byteCount, 67_295);
});

test("diagnostic stage and exact timeout code survive the sanitized card failure", async () => {
 let final;
 const telemetry=createAppV2CardTelemetry({cryptoImpl,postTelemetry:async events=>{if(events.length>1)final=sanitizeTechnicalTelemetryBatch(events);return {status:"accepted",accepted:events.length};}});
 telemetry.diagnostic({stage:"receiving",lastConfirmedStage:"receiving"});
 telemetry.progress({submessages:135,byteLength:34000});
 telemetry.diagnostic({stage:"receiving",lastConfirmedStage:"receiving",errorCode:"packet_idle_timeout"});
 telemetry.transportError(new Error("PACKET_IDLE_TIMEOUT"));
 await telemetry.finish({status:"read_error"});
 const failed=final.at(-1);
 assert.equal(failed.packetCount,135);
 assert.equal(failed.errorCode,"packet_idle_timeout");
 assert.equal(failed.stage,"receiving");
 assert.equal(failed.lastConfirmedStage,"receiving");
});
