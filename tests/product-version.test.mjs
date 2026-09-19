import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TACHOCOMMAND_VERSIONS, formatTachoCommandVersionLine } from "../lib/product-version.js";

const fieldClient = await readFile(new URL("../app/field-test/read-only-field-test-client.tsx", import.meta.url), "utf8");
const landing = await readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8");

test("product version manifest exposes factual independent surfaces", () => {
  assert.equal(TACHOCOMMAND_VERSIONS.site, "2026.09.19");
  assert.equal(TACHOCOMMAND_VERSIONS.app, "2026.09.19");
  assert.equal(TACHOCOMMAND_VERSIONS.cardEngine, "parser-native-history-2026.09.19");
  assert.equal(TACHOCOMMAND_VERSIONS.transport, "golden-0.32c");
});

test("visible product surfaces use the shared version manifest", () => {
  assert.ok(fieldClient.includes("formatTachoCommandVersionLine"));
  assert.ok(fieldClient.includes("TACHOCOMMAND_VERSIONS.app"));
  assert.ok(landing.includes("formatTachoCommandVersionLine"));
  const line = formatTachoCommandVersionLine();
  assert.match(line, /Site 2026\.09\.19/);
  assert.match(line, /App 2026\.09\.19/);
  assert.match(line, /Card parser-native-history-2026\.09\.19/);
  assert.match(line, /Transport golden-0\.32c/);
});

test("version manifest is descriptive only and contains no transport implementation", async () => {
  const source = await readFile(new URL("../lib/product-version.js", import.meta.url), "utf8");
  for (const forbidden of ["navigator.bluetooth", "requestDevice", "queueGattWrite", "TREP", "writeValue"]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must not appear in version metadata");
  }
});
