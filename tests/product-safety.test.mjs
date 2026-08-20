import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/tacho-command-app.tsx", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../lib/i18n.js", import.meta.url), "utf8");
const truthfulSource = `${appSource}\n${i18nSource}`;
const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

test("never ships the previous fake payment, licence, or DDD implementation", () => {
  for (const forbidden of [
    "pk_live_your_actual_stripe_key_here",
    "VALID_PROMO_CODES",
    "saveFakeDddFile",
    "TACHO-PRO-2026",
    "SHA256_VALID",
  ]) {
    assert.equal(appSource.includes(forbidden), false, `forbidden demo implementation found: ${forbidden}`);
  }
});

test("labels unverifiable sources and keeps the official tachograph authoritative", () => {
  assert.match(truthfulSource, /Nije povezano sa tahografom/);
  assert.match(truthfulSource, /Tahograf ostaje zvanični izvor/);
  assert.match(truthfulSource, /Sadržaj podataka još nije verifikovan/i);
});

test("is installable as a portrait standalone PWA", () => {
  assert.equal(manifest.short_name, "TachoCommand");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.equal(manifest.start_url, "/field-test");
  assert.ok(manifest.icons.length > 0);
});

test("offline cache is same-origin and keeps a navigation fallback", () => {
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /caches\.match\(url\.pathname === "\/app" \? "\/app" : "\/"\)/);
});

test("requests only published standard optional BLE services and keeps reports data-minimal", async () => {
  const bleSource = await readFile(new URL("../lib/tacho-ble.js", import.meta.url), "utf8");
  assert.match(bleSource, /eef90782-55dd-4388-b80b-695aba7a69b5/);
  assert.match(bleSource, /fa213def-aef4-475c-bcea-0a8d69073efc/);
  assert.match(bleSource, /No driver name, card number, VIN, vehicle registration, location, or raw tachograph bytes/);
  assert.match(appSource, /optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS/);
  assert.match(appSource, /const creditValue = Uint8Array\.of\(1\)/);
  assert.match(appSource, /credits\.writeValueWithResponse\(creditValue\)/);
  assert.match(appSource, /credits\.writeValueWithoutResponse\(creditValue\)/);
  assert.match(appSource, /Uint8Array\.of\(1, 1, 0x3e, 0x00\)/);
  assert.deepEqual(appSource.match(/fifo\.writeValue(?:WithResponse|WithoutResponse)?\(testerPresentPacket\)/g), [
    "fifo.writeValueWithResponse(testerPresentPacket)",
    "fifo.writeValueWithoutResponse(testerPresentPacket)",
    "fifo.writeValue(testerPresentPacket)",
  ]);
  assert.match(appSource, /exchangeUds\(\s*\[0x10, 0x7e\],\s*"diagnostic-session-sent"/);
  assert.match(appSource, /exchangeUds\(\s*\[0x22, didHigh, didLow\],\s*"driver-card-read-sent",\s*"driver-card-read-packet-observed"/);
  assert.doesNotMatch(appSource, /exchangeUds\(\s*\[0x10, 0x01\]/);
  assert.doesNotMatch(appSource, /diagnostic-session-skipped/);
  assert.match(appSource, /diagnostic-session-packet-observed/);
  assert.match(appSource, /driver-card-read-packet-observed/);
  assert.match(appSource, /observations: exchange\.observations/);
  assert.match(appSource, /new Uint8Array\(view\.buffer, view\.byteOffset, view\.byteLength\)/);
  assert.match(appSource, /setDriverCardReadAttempted\(true\)/);
  assert.doesNotMatch(appSource, /exchangeUds\(\[0x31, 0x01, 0xf2, 0x11\]/);
  assert.match(appSource, /did: 0xf903, name: "driver-working-state"/);
  assert.doesNotMatch(appSource, /did: 0xf923, name: "continuous-driving-time"/);
  assert.doesNotMatch(appSource, /did: 0xf190|did: 0xf97e|did: 0xf931/);
});
