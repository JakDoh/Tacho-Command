import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTechnicalAttempts } from "../lib/admin-card-attempts.js";

test("admin groups a failed attempt at the exact last reported packet without personal data", () => {
  const rows = [
    {attemptCode:"TC-ABCDEF",event:"card_transfer_error",createdAt:1100,packetCount:135,byteCount:34000,stage:"receiving",lastConfirmedStage:"receiving",errorCode:"packet_idle_timeout",nrc:null},
    {attemptCode:"TC-ABCDEF",event:"card_transfer_progress",createdAt:1050,packetCount:130,byteCount:33000,stage:"receiving",errorCode:null},
    {attemptCode:"TC-ABCDEF",event:"card_read_start",createdAt:1000,packetCount:0,byteCount:0,errorCode:null},
  ];
  const [attempt]=summarizeTechnicalAttempts(rows,1200);
  assert.equal(attempt.status,"failed");
  assert.deepEqual(attempt.diagnostic,{code:"015",label:"Očitavanje prekinuto: 60 s bez novog paketa"});
  assert.equal(attempt.packetCount,135);
  assert.equal(attempt.errorCode,"packet_idle_timeout");
  assert.equal(attempt.stage,"receiving");
  assert.equal(attempt.startedAt,1000);
  assert.equal(JSON.stringify(attempt).includes("driver"),false);
});
test("a missing terminal event is not reported as a proven failure", () => {
  const rows=[{attemptCode:"TC-ABCDEF",event:"card_transfer_progress",createdAt:1000,packetCount:130,byteCount:33000,errorCode:null}];
  assert.equal(summarizeTechnicalAttempts(rows,1050)[0].status,"in_progress");
  assert.equal(summarizeTechnicalAttempts(rows,1201)[0].status,"no_terminal_event");
});

test("old unknown Bluetooth failures get code 021 without guessing a cause", () => {
  const [attempt] = summarizeTechnicalAttempts([
    {attemptCode:"TC-ABCDEF",event:"error",phase:"bluetooth",createdAt:1100,errorCode:"unknown"},
    {attemptCode:"TC-ABCDEF",event:"connect_start",phase:"bluetooth",createdAt:1000},
  ], 1200);
  assert.equal(attempt.kind,"live");
  assert.equal(attempt.status,"failed");
  assert.equal(attempt.diagnostic.code,"021");
  assert.match(attempt.diagnostic.label,/tačan uzrok nije zabeležen/);
});

test("unknown card failure does not claim a packet idle timeout", () => {
  const [attempt] = summarizeTechnicalAttempts([
    {attemptCode:"TC-ABCDEF",event:"card_transfer_error",phase:"card_transfer",createdAt:1000,errorCode:"unknown"},
  ], 1200);
  assert.equal(attempt.diagnostic.code,"099");
});

test("a completed LIVE attempt has a stable success code", () => {
  const [attempt] = summarizeTechnicalAttempts([
    {attemptCode:"TC-ABCDEF",event:"snapshot_complete",phase:"live_read",createdAt:1100},
  ], 1200);
  assert.equal(attempt.diagnostic.code,"000");
});
