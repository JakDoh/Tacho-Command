import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientSource = await readFile(new URL("../app/field-test/read-only-field-test-client.tsx", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/field-test/page.tsx", import.meta.url), "utf8");

test("field-test route uses the read-only core candidate", () => {
  assert.match(pageSource, /read-only-field-test-client/);
  assert.doesNotMatch(pageSource, /from\s+["']\.\/field-test-client["']/);
});

test("read-only field candidate does not open RHMI or diagnostic sessions", () => {
  assert.doesNotMatch(clientSource, /0x31\s*,\s*0x01\s*,\s*0xf2\s*,\s*0x11/i);
  assert.doesNotMatch(clientSource, /0x10\s*,\s*0x7e/i);
  assert.doesNotMatch(clientSource, /classifyOpenRhmiPacket|describeRhmiStatus/);
});

test("read-only field candidate uses shared UDS reassembly and core telemetry modules", () => {
  assert.match(clientSource, /createUdsResponseCollector/);
  assert.match(clientSource, /readCoreDriverTelemetry/);
  assert.match(clientSource, /TesterPresent potvrđen\. Krećem direktno na read-only 0x22 RDBI/);
});
