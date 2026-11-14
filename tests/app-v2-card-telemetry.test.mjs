import assert from "node:assert/strict";
import test from "node:test";
import { createAppV2CardTelemetry } from "../lib/app-v2-card-telemetry.js";
import { sanitizeTechnicalTelemetryBatch } from "../lib/technical-telemetry.js";
import { summarizeTechnicalAttempts } from "../lib/admin-card-attempts.js";
import { runBrowserAppV2GoldenCardRead } from "../lib/app-v2-card-transport-controller-bridge.js";
import { diagnosticForAttempt } from "../lib/diagnostic-codes.js";

const cryptoImpl = {
  randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
  getRandomValues: (bytes) => {
    bytes.fill(1);
    return bytes;
  },
};

test('historic stationary failures retain code 034 without inferred speed', () => {
 const [row]=sanitizeTechnicalTelemetryBatch([{sessionId:cryptoImpl.randomUUID(),attemptCode:'TC-BBBBBB',event:'card_preparation_error',phase:'card_preparation',outcome:'error',stage:'stationary_check',errorCode:'stationary_not_confirmed'}]);
 assert.equal(row.errorCode,'stationary_not_confirmed');
 assert.equal(diagnosticForAttempt({kind:'card',status:'failed',errorCode:row.errorCode}).code,'034');
});

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

function preparationRecorder() {
 const batches=[];
 let next=0;
 const telemetryOptions={preparing:true,cryptoImpl:{...cryptoImpl,getRandomValues(bytes){bytes.fill(++next);return bytes;}},
  postTelemetry:async events=>{batches.push(sanitizeTechnicalTelemetryBatch(events));return {status:'accepted',accepted:events.length};}};
 return {batches,make:()=>createAppV2CardTelemetry(telemetryOptions)};
}

test('pre-transfer LIVE close failure reaches sanitized admin with zero packets and last confirmed stage',async()=>{
 const {batches,make}=preparationRecorder();
 const attempt=make();
 assert.equal(batches[0][0].event,'card_preparation_start');
 attempt.preparationStage('stationary_check');
 attempt.preparationStage('stationary_confirmed');
 attempt.preparationStage('live_teardown');
 attempt.preparationError(new Error('LIVE_CLOSE_TIMEOUT'));
 await attempt.finish({status:'preparation_error'});
 const final=batches.at(-1);
 const row=final.at(-1);
 assert.equal(row.event,'card_preparation_error');
 assert.equal(row.packetCount,0);assert.equal(row.byteCount,0);
 assert.equal(row.stage,'live_teardown');assert.equal(row.lastConfirmedStage,'stationary_confirmed');
 assert.equal(row.errorCode,'live_close_timeout');
 const [admin]=summarizeTechnicalAttempts(final.slice().reverse().map((event,i)=>({...event,createdAt:100-i})),200);
 assert.equal(admin.status,'failed');assert.equal(admin.kind,'card');assert.equal(admin.diagnostic.code,'031');
 assert.equal(final.some(e=>e.event==='card_read_start'),false);
});

test('a successful retry has a separate code and cannot hide the prior preparation failure',async()=>{
 const {batches,make}=preparationRecorder();
 const failed=make();failed.preparationStage('live_idle_wait');
 failed.preparationError(new Error('LIVE provera se nije završila na vreme.'));
 await failed.finish({status:'preparation_error'});
 const failedRows=batches.at(-1);
 const retry=make();retry.preparationStage('stationary_confirmed');retry.transportStart();retry.transportStart();
 retry.progress({submessages:269,byteLength:67295});retry.transportComplete();await retry.finish({status:'accepted'});
 const successRows=batches.at(-1);
 assert.notEqual(failed.attemptCode,retry.attemptCode);
 assert.equal(successRows.filter(e=>e.event==='card_read_start').length,1);
 assert.ok(successRows.every(e=>e.attemptCode===retry.attemptCode));
 const rows=[...successRows.map(e=>({...e,createdAt:200})),...failedRows.map(e=>({...e,createdAt:100}))].reverse().sort((a,b)=>b.createdAt-a.createdAt);
 const admin=summarizeTechnicalAttempts(rows,300);
 assert.equal(admin.length,2);
 assert.equal(admin.find(a=>a.attemptCode===failed.attemptCode).status,'failed');
 assert.equal(admin.find(a=>a.attemptCode===failed.attemptCode).diagnostic.code,'030');
 assert.equal(admin.find(a=>a.attemptCode===retry.attemptCode).status,'complete');
});

test('cancelled preparation is distinct from failure; repeated finish sends one terminal batch',async()=>{
 const {batches,make}=preparationRecorder();const attempt=make();
 attempt.preparationStage('live_teardown');attempt.preparationError(new Error('BLE_CANCELLED'));
 const first=attempt.finish({status:'preparation_error'});
 assert.equal(attempt.finish({status:'preparation_error'}),first);
 await first;
 assert.equal(batches.filter(batch=>batch.some(e=>e.event==='card_preparation_error')).length,1);
 const final=batches.at(-1);
 assert.equal(final.at(-1).outcome,'cancelled');
 const [admin]=summarizeTechnicalAttempts(final.slice().reverse().map(e=>({...e,createdAt:100})),200);
 assert.equal(admin.status,'cancelled');assert.equal(admin.diagnostic.code,'032');
});

test('preparation taxonomy describes observed signals and never sends free-form error text',async()=>{
 for (const [stage,message,code] of [
  ['live_validation','Prvo povežite tahograf za bezbednu LIVE vezu.','live_unavailable'],
  ['stationary_check','Vozilo nije na 0 km/h — BLE veza je prekinuta.','stationary_response_nonzero'],
  ['stationary_check','Brzina tahografa nije potvrđena — BLE veza je prekinuta.','stationary_response_unconfirmed'],
  ['live_teardown','unexpected private driver/card text','unknown'],
 ]) {
  const {batches,make}=preparationRecorder();const attempt=make();
  attempt.preparationStage(stage);attempt.preparationError(new Error(message));await attempt.finish({status:'preparation_error'});
  assert.equal(batches.at(-1).at(-1).errorCode,code);
  if (code.startsWith('stationary_response_')) {
   const [admin]=summarizeTechnicalAttempts(batches.at(-1).slice().reverse().map(e=>({...e,createdAt:100})),200);
   assert.equal(admin.status,'failed');assert.equal(admin.packetCount,0);
   assert.equal(admin.diagnostic.code,code==='stationary_response_nonzero'?'036':'035');
  }
  assert.equal(JSON.stringify(batches).includes(message),false);
 }
});

test('controller bridge reuses the preparation identity on transport failure without awaiting telemetry',async()=>{
 const {batches,make}=preparationRecorder();const attempt=make();
 let code;
 const result=await runBrowserAppV2GoldenCardRead({telemetry:attempt,onTelemetryAttempt:value=>{code=value;},
  transportOptions:{bluetooth:null}});
 assert.equal(result.status,'read_error');assert.equal(code,attempt.attemptCode);
 assert.equal(result.cardAttemptCode,attempt.attemptCode);
 await attempt.finish({status:'read_error'});
 const final=batches.at(-1);
 assert.equal(final.filter(e=>e.event==='card_preparation_start').length,1);
 assert.equal(final.filter(e=>e.event==='card_read_start').length,1);
 assert.ok(final.every(e=>e.attemptCode===attempt.attemptCode));
 assert.equal(final.at(-1).event,'card_transfer_error');
});

test('unavailable random generator and failed telemetry cannot block card preparation',async()=>{
 assert.equal(createAppV2CardTelemetry({cryptoImpl:{...cryptoImpl,randomUUID(){throw Error('unavailable');}},preparing:true}),null);
 const attempt=createAppV2CardTelemetry({cryptoImpl,preparing:true,postTelemetry(){throw Error('network failure');}});
 attempt.preparationStage('live_idle_wait');attempt.preparationError(new Error('LIVE_CLOSE_TIMEOUT'));
 assert.equal((await attempt.finish({status:'preparation_error'})).status,'network_unavailable');
});
