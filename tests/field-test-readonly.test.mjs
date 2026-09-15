import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientSource = await readFile(new URL("../app/field-test/read-only-field-test-client.tsx", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/field-test/page.tsx", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const appRecovery = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

test("field-test route uses the read-only core candidate", () => {
  assert.match(pageSource, /read-only-field-test-client/);
  assert.doesNotMatch(pageSource, /from\s+["']\.\/field-test-client["']/);
  assert.match(clientSource, /0\.31b-f903-single-probe/);
});

test("read-only field candidate does not open RHMI or diagnostic sessions", () => {
  assert.doesNotMatch(clientSource, /0x31\s*,\s*0x01\s*,\s*0xf2\s*,\s*0x11/i);
  assert.doesNotMatch(clientSource, /0x10\s*,\s*0x7e/i);
  assert.doesNotMatch(clientSource, /classifyOpenRhmiPacket|describeRhmiStatus/);
});

test("read-only field candidate uses shared UDS reassembly and F903 helpers", () => {
  assert.match(clientSource, /createUdsResponseCollector/);
  assert.match(clientSource, /buildReadDataByIdentifier/);
  assert.match(clientSource, /parseDriverWorkingState/);
  assert.match(clientSource, /TesterPresent potvrđen\. Šaljem jedan read-only F903 zahtev/);
});

test("field candidate serializes every Web Bluetooth GATT write", () => {
  assert.match(clientSource, /gattWriteQueueRef/);
  assert.match(clientSource, /queueGattWrite\(credits, \[1\]\)/);
  assert.match(clientSource, /queueGattWrite\(fifo, \[1, 1, \.\.\.payload\]\)/);
  assert.doesNotMatch(clientSource, /writeGatt\(fifo, \[1, 1, \.\.\.payload\]\)/);
});

test("field candidate sends exactly one bounded F903 probe and no telemetry loop", () => {
  assert.match(clientSource, /DRIVER_1_WORKING_STATE/);
  assert.match(clientSource, /F903 rezultat: TIMEOUT/);
  assert.match(clientSource, /F903 rezultat: NRC/);
  assert.match(clientSource, /F903 rezultat: POSITIVE/);
  assert.doesNotMatch(clientSource, /runTelemetry|readCoreDriverTelemetry/);
  assert.doesNotMatch(clientSource, /DRIVER_1_CONTINUOUS_DRIVING|DRIVER_1_CUMULATIVE_BREAK|DRIVER_1_CURRENT_DAILY_DRIVING|DRIVER_1_CURRENT_WEEKLY_DRIVING/);
});

test("field candidate exposes a copyable diagnostic log", () => {
  assert.match(clientSource, /Kopiraj dnevnik/);
  assert.match(clientSource, /navigator\.clipboard\.writeText/);
});

test("PWA and legacy recovery surfaces point to the 0.31 field candidate", () => {
  assert.equal(manifest.start_url, "/field-test");
  assert.match(manifest.name, /0\.31/);
  assert.doesNotMatch(manifest.name, /RHMI|0\.16/);
  assert.match(serviceWorker, /tachocommand-shell-v31-core-rdbi/);
  assert.match(serviceWorker, /caches\.match\("\/field-test"\)/);
  assert.match(appRecovery, /recovered=031/);
  assert.match(workerSource, /recovered=031/);
  assert.doesNotMatch(`${appRecovery}\n${workerSource}`, /recovered=016/);
});
