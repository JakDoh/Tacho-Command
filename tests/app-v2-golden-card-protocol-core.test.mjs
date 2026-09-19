import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_V2_GOLDEN_CARD_COMMANDS,
  buildAppV2GoldenAck,
  classifyAppV2GoldenResponse,
  createAppV2GoldenCardAssembler,
  validateAppV2GoldenCardTlv,
} from "../lib/app-v2-golden-card-protocol-core.js";

const checksum = (bytes) => bytes.reduce((sum, value) => (sum + value) & 0xff, 0);
const withChecksum = (bytes) => Uint8Array.from([...bytes, checksum(bytes)]);

test("golden-compatible command bytes stay identical to preserved 0.32c contract", () => {
  assert.deepEqual(APP_V2_GOLDEN_CARD_COMMANDS.startCommunication, [0x81,0xee,0xf0,0x81,0xe0]);
  assert.deepEqual(APP_V2_GOLDEN_CARD_COMMANDS.startDiagnosticSession, [0x80,0xee,0xf0,0x02,0x10,0x81,0xf1]);
  assert.deepEqual(APP_V2_GOLDEN_CARD_COMMANDS.cardSlot1, [0x80,0xee,0xf0,0x03,0x36,0x06,0x01,0x9e]);
  assert.deepEqual(APP_V2_GOLDEN_CARD_COMMANDS.transferExit, [0x80,0xee,0xf0,0x01,0x37,0x96]);
  assert.deepEqual(APP_V2_GOLDEN_CARD_COMMANDS.stopCommunication, [0x80,0xee,0xf0,0x01,0x82,0xe1]);
});

test("NRC 0x78 is classified as pending, not as retry", () => {
  const response = withChecksum([0x80,0xf0,0xee,0x03,0x7f,0x36,0x78]);
  const result = classifyAppV2GoldenResponse(response, 0x36, 0x06);

  assert.equal(result.valid, true);
  assert.equal(result.negative, true);
  assert.equal(result.responsePending, true);
  assert.equal(result.nrc, 0x78);
});

test("multipart assembler enforces exact submessage counter and produces next ACK", () => {
  const assembler = createAppV2GoldenCardAssembler();
  const firstData = new Array(251).fill(0x11);
  const first = withChecksum([0x80,0xf0,0xee,0xff,0x76,0x06,0x00,0x01,...firstData]);
  const result = assembler.push(first);

  assert.equal(result.status, "continue");
  assert.equal(result.submessages, 1);
  assert.equal(result.total, 251);
  assert.deepEqual(result.nextAck, buildAppV2GoldenAck(2));

  const wrong = withChecksum([0x80,0xf0,0xee,0x06,0x76,0x06,0x00,0x03,0xaa,0xbb]);
  const rejected = assembler.push(wrong);
  assert.equal(rejected.status, "error");
  assert.equal(rejected.reason, "counter-mismatch");
});

test("multipart assembler completes only on final short TREP06 response", () => {
  const assembler = createAppV2GoldenCardAssembler();
  const firstData = new Array(251).fill(0x11);
  const first = withChecksum([0x80,0xf0,0xee,0xff,0x76,0x06,0x00,0x01,...firstData]);
  assert.equal(assembler.push(first).status, "continue");

  const final = withChecksum([0x80,0xf0,0xee,0x08,0x76,0x06,0x00,0x02,0x05,0x04,0x02,0x00]);
  const completed = assembler.push(final);

  assert.equal(completed.status, "complete");
  assert.equal(completed.submessages, 2);
  assert.equal(completed.total, 255);
  assert.equal(completed.payload.byteLength, 255);
});

test("golden TLV gate rejects truncated payload and accepts complete objects", () => {
  const good = Uint8Array.from([
    0x05,0x04,0x02,0x00,0x02,0xaa,0xbb,
    0x05,0x01,0x02,0x00,0x01,0xcc,
  ]);
  assert.deepEqual(validateAppV2GoldenCardTlv(good), {
    valid: true,
    count: 2,
    reason: null,
  });

  const bad = Uint8Array.from([0x05,0x04,0x02,0x00,0x04,0xaa]);
  const rejected = validateAppV2GoldenCardTlv(bad);
  assert.equal(rejected.valid, false);
  assert.equal(rejected.reason, "truncated-value");
});

test("protocol core stays pure and contains no browser transport or persistence code", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../lib/app-v2-golden-card-protocol-core.js", import.meta.url), "utf8");

  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "localStorage",
    "saveLastGoodCardSnapshot",
    "fetch(",
    "window.",
    "document.",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside protocol core");
  }
});
