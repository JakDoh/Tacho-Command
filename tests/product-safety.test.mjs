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
  assert.match(appSource, /tahografski protokol još nije verifikovan/i);
  assert.match(appSource, /Lažni `\.DDD` je uklonjen/);
});

test("is installable as a portrait standalone PWA", () => {
  assert.equal(manifest.short_name, "TachoCommand");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.length > 0);
});

test("offline cache is same-origin and keeps a navigation fallback", () => {
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /caches\.match\("\/"\)/);
});
