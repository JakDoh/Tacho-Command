import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCardAttempts } from "../lib/admin-card-attempts.js";

test("admin groups a failed attempt at the exact last reported packet without personal data", () => {
  const rows = [
    {attemptCode:"TC-ABCDEF",event:"card_transfer_error",createdAt:1100,packetCount:135,byteCount:34000,stage:"receiving",lastConfirmedStage:"receiving",errorCode:"packet_idle_timeout",nrc:null},
    {attemptCode:"TC-ABCDEF",event:"card_transfer_progress",createdAt:1050,packetCount:130,byteCount:33000,stage:"receiving",errorCode:null},
    {attemptCode:"TC-ABCDEF",event:"card_read_start",createdAt:1000,packetCount:0,byteCount:0,errorCode:null},
  ];
  const [attempt]=summarizeCardAttempts(rows,1200);
  assert.equal(attempt.status,"failed");
  assert.equal(attempt.packetCount,135);
  assert.equal(attempt.errorCode,"packet_idle_timeout");
  assert.equal(attempt.stage,"receiving");
  assert.equal(attempt.startedAt,1000);
  assert.equal(JSON.stringify(attempt).includes("driver"),false);
});
test("a missing terminal event is not reported as a proven failure", () => {
  const rows=[{attemptCode:"TC-ABCDEF",event:"card_transfer_progress",createdAt:1000,packetCount:130,byteCount:33000,errorCode:null}];
  assert.equal(summarizeCardAttempts(rows,1050)[0].status,"in_progress");
  assert.equal(summarizeCardAttempts(rows,1201)[0].status,"no_terminal_event");
});
