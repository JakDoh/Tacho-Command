import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import { drizzle } from "drizzle-orm/d1";
import { createAppV2CardTelemetry } from "../lib/app-v2-card-telemetry.js";
import { sanitizeTechnicalTelemetryBatch } from "../lib/technical-telemetry.js";
import { summarizeTechnicalAttempts } from "../lib/admin-card-attempts.js";
const transpile = source => ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const dataUrl = source => "data:text/javascript;base64,"+Buffer.from(source).toString("base64");
const schemaUrl=dataUrl(transpile(await readFile(new URL("../db/schema.ts",import.meta.url),"utf8")).replace('"drizzle-orm/sqlite-core"',JSON.stringify(import.meta.resolve("drizzle-orm/sqlite-core"))));
const {technicalTelemetryEvents:table}=await import(schemaUrl);
const storageSource=transpile(await readFile(new URL("../lib/technical-telemetry-storage.ts",import.meta.url),"utf8"))
 .replace('"drizzle-orm"',JSON.stringify(import.meta.resolve("drizzle-orm")))
 .replace('"../db/schema"',JSON.stringify(schemaUrl));
const {storeTechnicalTelemetry}=await import(dataUrl(storageSource));
function database(failAt=-1) {
 const sqlite=new DatabaseSync(":memory:");
 sqlite.exec(`CREATE TABLE technical_telemetry_events (id INTEGER PRIMARY KEY,session_id TEXT,attempt_code TEXT,event TEXT,phase TEXT,outcome TEXT,did TEXT,duration_ms INTEGER,nrc INTEGER,device_family TEXT,error_code TEXT,stage TEXT,last_confirmed_stage TEXT,packet_count INTEGER,byte_count INTEGER,created_at INTEGER)`);
 const client={prepare(sql){return {bind(...params){assert.ok(params.length<=100,"D1 bound parameter limit exceeded");return {sql,params};}};},async batch(statements){
  sqlite.exec("BEGIN");
  try {const results=statements.map((q,i)=>{if(i===failAt)throw new Error("injected write failure");sqlite.prepare(q.sql).run(...q.params);return {results:[],success:true};});sqlite.exec("COMMIT");return results;}
  catch(error){sqlite.exec("ROLLBACK");throw error;}
 }};
 return {db:drizzle(client),sqlite};
}
const cryptoImpl={randomUUID:()=>"123e4567-e89b-42d3-a456-426614174000",getRandomValues:bytes=>bytes.fill(1)};
async function finalReport(packetCount) {
 let final;
 const telemetry=createAppV2CardTelemetry({preparing:true,cryptoImpl,postTelemetry:async events=>{final=sanitizeTechnicalTelemetryBatch(events);return {status:"accepted",accepted:final.length};}});
 for(const stage of ["live_idle_wait","live_validation","stationary_check","stationary_confirmed","live_teardown"])telemetry.preparationStage(stage);
 telemetry.transportStart();telemetry.progress({submessages:packetCount,byteLength:packetCount*251});telemetry.transportComplete();await telemetry.finish({status:"accepted"});return final;
}
test("prepared card final report exceeds old INSERT limit but atomic storage retains terminal event",async()=>{
 for(const packets of [269,491]){
  const events=await finalReport(packets);const {db,sqlite}=database();
  const oldRows=events.map(event=>({...event,schema:undefined,createdAt:1000}));
  assert.ok(db.insert(table).values(oldRows).toSQL().params.length>100);
  await storeTechnicalTelemetry(db,events,1000,0);
  const rows=sqlite.prepare("SELECT attempt_code AS attemptCode,event,phase,outcome,packet_count AS packetCount,byte_count AS byteCount,created_at AS createdAt FROM technical_telemetry_events ORDER BY id DESC").all();
  assert.equal(rows.length,events.length);const [attempt]=summarizeTechnicalAttempts(rows,2000);
  assert.equal(attempt.status,"complete");assert.equal(attempt.packetCount,packets);sqlite.close();
 }
});
test("maximum accepted batch fits D1 limits and a failed write rolls back the entire report",async()=>{
 const report=await finalReport(491);const events=Array.from({length:20},(_,i)=>report[i%report.length]);
 const good=database();await storeTechnicalTelemetry(good.db,events,1000,0);
 assert.equal(good.sqlite.prepare("SELECT COUNT(*) AS n FROM technical_telemetry_events").get().n,20);good.sqlite.close();
 const bad=database(3);await assert.rejects(storeTechnicalTelemetry(bad.db,events,1000,0),/injected/);
 assert.equal(bad.sqlite.prepare("SELECT COUNT(*) AS n FROM technical_telemetry_events").get().n,0);bad.sqlite.close();
});
