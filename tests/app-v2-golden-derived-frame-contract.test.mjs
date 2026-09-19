import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  APP_V2_GOLDEN_CARD_COMMANDS,
  buildAppV2GoldenAck,
} from "../lib/app-v2-golden-card-protocol-core.js";

const goldenUrl = new URL(
  "../docs/field-evidence/2026-09-16/TachoCommand-0.32c-driver-card-slot1-field-test.html",
  import.meta.url,
);

function extractArray(source, name) {
  const pattern = new RegExp(
    "const\\s+" + name + "\\s*=withChecksum\\(\\[([^\\]]+)\\]\\);",
  );
  const match = source.match(pattern);
  assert.ok(match, name + " must exist in preserved golden artifact");

  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part));
}

function checksum(bytes) {
  return bytes.reduce((sum, value) => (sum + value) & 0xff, 0);
}

function withChecksum(bytes) {
  return [...bytes, checksum(bytes)];
}

test("candidate command frames are derived from preserved golden 0.32c source", async () => {
  const source = await readFile(goldenUrl, "utf8");
  const pairs = [
    ["START_COMM", APP_V2_GOLDEN_CARD_COMMANDS.startCommunication],
    ["START_DIAG", APP_V2_GOLDEN_CARD_COMMANDS.startDiagnosticSession],
    ["REQUEST_UPLOAD", APP_V2_GOLDEN_CARD_COMMANDS.requestUpload],
    ["CARD_SLOT1", APP_V2_GOLDEN_CARD_COMMANDS.cardSlot1],
    ["TRANSFER_EXIT", APP_V2_GOLDEN_CARD_COMMANDS.transferExit],
    ["STOP_COMM", APP_V2_GOLDEN_CARD_COMMANDS.stopCommunication],
  ];

  for (const [goldenName, candidate] of pairs) {
    const goldenRaw = extractArray(source, goldenName);
    assert.deepEqual(candidate, withChecksum(goldenRaw), goldenName);
  }
});

test("candidate ACK builder matches preserved golden buildAck formula", async () => {
  const source = await readFile(goldenUrl, "utf8");
  assert.match(
    source,
    /function buildAck\(code\)\{return withChecksum\(\[0x80,0xee,0xf0,0x04,0x83,0x76,\(code>>8\)&0xff,code&0xff\]\);\}/,
  );

  for (const counter of [1, 2, 269, 0xffff]) {
    const golden = withChecksum([
      0x80,
      0xee,
      0xf0,
      0x04,
      0x83,
      0x76,
      (counter >> 8) & 0xff,
      counter & 0xff,
    ]);
    assert.deepEqual(buildAppV2GoldenAck(counter), golden);
  }
});

test("preserved golden artifact still names the exact no-retry TREP06 contract", async () => {
  const source = await readFile(goldenUrl, "utf8");

  assert.match(source, /Card Download TREP 06, slot 1/);
  assert.match(source, /NEMA TREP 00/);
  assert.match(source, /NEMA TREP 31/);
  assert.match(source, /NEMA auto-retry/);
  assert.match(source, /nrc===0x78/);
  assert.match(source, /čekam bez retransmisije/);
});
