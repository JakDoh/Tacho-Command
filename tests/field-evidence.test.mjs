import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const evidenceUrl = new URL(
  "../docs/field-evidence/2026-09-16/TachoCommand-0.32c-driver-card-slot1-field-test.html",
  import.meta.url,
);
const expectedSha256 =
  "cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908";

test("golden 0.32c field artifact remains byte-for-byte intact", async () => {
  const bytes = await readFile(evidenceUrl);
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");

  assert.equal(bytes.byteLength, 21_561);
  assert.equal(actualSha256, expectedSha256);
});

test("golden 0.32c preserves the proven direct card-download invariants", async () => {
  const source = await readFile(evidenceUrl, "utf8");

  assert.match(source, /APP_VERSION="0\.32c-driver-card-slot1-single-shot"/);
  assert.match(source, /SOURCE_BASELINE="708fc3cb6d117da7cade478eb29cd0d8320ff776"/);
  assert.match(source, /DDP_P3_GUARD_MS=100/);
  assert.match(source, /CARD_IDLE_TIMEOUT_MS=20\*60\*1000/);
  assert.match(source, /Card Download TREP 06, slot 1/);
  assert.match(source, /NEMA TREP 00/);
  assert.match(source, /NEMA TREP 31/);
  assert.match(source, /NEMA auto-retry/);
  assert.match(source, /DDP RequestTransferExit/);
  assert.match(source, /DDP StopCommunication/);
});
