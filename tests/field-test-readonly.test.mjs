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
  assert.match(clientSource, /TACHOCOMMAND_VERSIONS\.app/);
  assert.match(clientSource, /formatTachoCommandVersionLine/);
});

test("read-only field candidate does not open RHMI or diagnostic sessions", () => {
  assert.doesNotMatch(clientSource, /0x31\s*,\s*0x01\s*,\s*0xf2\s*,\s*0x11/i);
  assert.doesNotMatch(clientSource, /0x10\s*,\s*0x7e/i);
  assert.doesNotMatch(clientSource, /classifyOpenRhmiPacket|describeRhmiStatus/);
});

test("read-only field candidate uses shared UDS reassembly and DID parsers", () => {
  assert.match(clientSource, /createUdsResponseCollector/);
  assert.match(clientSource, /buildReadDataByIdentifier/);
  assert.match(clientSource, /parseDriverWorkingState/);
  assert.match(clientSource, /parseDriverMinutesDid/);
  assert.match(clientSource, /TesterPresent potvrđen\. Sačekajte 1 s za stabilizaciju transporta/);
});

test("field candidate lets the transport settle before the first RDBI and formats durations", () => {
  const testerPresentLog = clientSource.indexOf("TesterPresent potvrđen. Sačekajte 1 s");
  const settlingDelay = clientSource.indexOf("await sleep(1000)", testerPresentLog);
  const firstRdbi = clientSource.indexOf('probeMinutes("F923"', settlingDelay);
  assert.ok(testerPresentLog >= 0 && settlingDelay > testerPresentLog && firstRdbi > settlingDelay);
  assert.match(clientSource, /formatMinutes\(parsed\.minutes\)/);
  assert.match(clientSource, /formatSeconds\(dailyDrivingSec\)/);
});

test("field candidate serializes every Web Bluetooth GATT write", () => {
  assert.match(clientSource, /gattWriteQueueRef/);
  assert.match(clientSource, /queueGattWrite\(credits, \[1\]\)/);
  assert.match(clientSource, /queueGattWrite\(fifo, \[1, 1, \.\.\.payload\]\)/);
  assert.doesNotMatch(clientSource, /writeGatt\(fifo, \[1, 1, \.\.\.payload\]\)/);
});

test("field candidate runs one bounded observable pass without a telemetry loop", () => {
  assert.match(clientSource, /DRIVER_1_WORKING_STATE/);
  assert.match(clientSource, /DRIVER_1_CONTINUOUS_DRIVING/);
  assert.match(clientSource, /DRIVER_1_CUMULATIVE_BREAK/);
  assert.match(clientSource, /DRIVER_1_CURRENT_DAILY_DRIVING/);
  assert.match(clientSource, /DRIVER_1_CURRENT_WEEKLY_DRIVING/);
  assert.match(clientSource, /rezultat: TIMEOUT/);
  assert.match(clientSource, /rezultat: NRC/);
  assert.match(clientSource, /rezultat: POSITIVE/);
  assert.doesNotMatch(clientSource, /runTelemetry|readCoreDriverTelemetry/);
  assert.doesNotMatch(clientSource, /while\s*\(!stopRef\.current\)/);
});

test("technical telemetry is buffered during BLE and posted only after the bounded pass", () => {
  assert.match(clientSource, /postTechnicalTelemetry/);
  assert.match(clientSource, /const telemetryEvents: TelemetryEvent\[\] = \[\]/);
  assert.match(clientSource, /deviceFamily:\s*"unknown"/);
  assert.match(clientSource, /snapshot_complete/);

  const finalRead = clientSource.indexOf('probeMinutes("F99B"');
  const snapshotComplete = clientSource.indexOf('addTechnicalEvent("snapshot_complete"', finalRead);
  const post = clientSource.indexOf("await postTechnicalTelemetry(telemetryEvents)", snapshotComplete);
  assert.ok(finalRead >= 0 && snapshotComplete > finalRead && post > snapshotComplete);

  assert.doesNotMatch(clientSource, /driverName\s*:/);
  assert.doesNotMatch(clientSource, /cardNumber\s*:/);
  assert.doesNotMatch(clientSource, /vehicleRegistration\s*:/);
  assert.doesNotMatch(clientSource, /rawBytes\s*:/);
  assert.doesNotMatch(clientSource, /actualValue\s*:/);
});

test("field candidate creates one anonymous support code per attempt and reuses it for telemetry", () => {
  assert.match(clientSource, /createTechnicalTelemetryAttemptCode\(window\.crypto\)/);
  assert.match(clientSource, /attemptCodeRef\.current = attemptCode/);
  assert.match(clientSource, /sessionId,[\s\S]*?attemptCode,[\s\S]*?event,/);
  assert.match(clientSource, /attemptCode:\s*attemptCodeRef\.current/);
  assert.match(clientSource, /Šifra pokušaja:/);
});

test("field candidate exposes a copyable diagnostic log", () => {
  assert.match(clientSource, /Kopiraj dnevnik/);
  assert.match(clientSource, /navigator\.clipboard\.writeText/);
});

test("PWA opens App V2 while field-test stays separately available", () => {
  assert.equal(manifest.start_url, "/app");
  assert.equal(manifest.short_name, "TachoCommand");
  assert.doesNotMatch(manifest.name, /Core Field Test|0\.31|RHMI|0\.16/);
  assert.match(serviceWorker, /tachocommand-shell-v47-app-v3/);
  assert.match(serviceWorker, /caches\.match\("\/"\)/);
  assert.match(appRecovery, /AppV2Client/);
  assert.doesNotMatch(appRecovery, /recovered=031/);
  assert.doesNotMatch(workerSource, /LEGACY_APP_RECOVERY_HTML|recovered=031/);
});


test("field candidate includes the physically verified DTCO 4.1a pairing guide without changing transport", () => {
  for (const phrase of [
    "Prvi put povezuješ telefon?",
    "ITS PODACI",
    "PAIRING / Koppelung",
    "Bitte verbinden",
    "6-cifreni PIN",
    "Eingabe gespeichert",
    "Poveži tahograf",
    "nRF Connect for Mobile",
    "pokreni Scan",
    "probaj Connect",
  ]) {
    assert.ok(clientSource.includes(phrase), phrase + " must be present");
  }

  const guideStart = clientSource.indexOf("function DtcoPairingGuide()");
  const guideEnd = clientSource.indexOf("export default function ReadOnlyFieldTestClient()", guideStart);
  assert.ok(guideStart >= 0 && guideEnd > guideStart);
  const guideSource = clientSource.slice(guideStart, guideEnd);
  for (const forbidden of ["requestDevice", "queueGattWrite", "buildReadDataByIdentifier", "postTechnicalTelemetry"]) {
    assert.equal(guideSource.includes(forbidden), false, forbidden + " must not be part of pairing help");
  }
});
