import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const landing = await readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8");
const launcher = await readFile(new URL("../app/trial-launcher.tsx", import.meta.url), "utf8");
const appPage = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const installGuide = await readFile(new URL("../app/install-guide.tsx", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

test("public root tells the field-proven 2026-09-16 product story", () => {
  assert.match(landing, /FIELD PROVEN/);
  assert.match(landing, /VDO DTCO 4\.1a/);
  assert.match(landing, /GEN2 V2/);
  assert.match(landing, /217/);
  assert.match(landing, /56 \/ 56/);
  assert.match(landing, /67\.295 B/);
  assert.match(landing, /data-release=\{LANDING_RELEASE\}/);
  assert.match(appPage, /window\.location\.replace/);
});

test("landing offers SR, EN and DE without fabricating field screenshots", () => {
  assert.match(landing, /value="sr"/);
  assert.match(landing, /value="en"/);
  assert.match(landing, /value="de"/);
  assert.match(landing, /PRODUCT VIEWS • FIELD DATA/);
  assert.match(landing, /Finalni landing će dobiti i prave screenshotove produkcijskog UI-ja/);
  assert.doesNotMatch(landing, /screenshots\/cockpit\.(?:webp|png)/);
  assert.match(landing, /legal: \{ privacy:/);
  assert.match(launcher, /loadingLabel/);
  assert.match(launcher, /errorLabel/);
});

test("landing keeps compatibility claims bounded to real field evidence", () => {
  assert.match(landing, /FIELD TESTED/);
  assert.match(landing, /PLANNED \/ NOT YET CLAIMED/);
  assert.match(landing, /iPhone \/ Safari Web Bluetooth path/);
  assert.match(landing, /Drugi Smart Tacho 2 modeli bez field testa/);
  assert.match(landing, /Potpuna kriptografska signature validacija u UI-ju/);
  assert.doesNotMatch(landing, /100% Read-Only/);
});

test("beginner install guide documents Chrome home-screen installation and direct PWA prompt", () => {
  assert.match(installGuide, /tri tačke gore desno/);
  assert.match(installGuide, /Install app/);
  assert.match(installGuide, /Dodaj na početni ekran/);
  assert.match(installGuide, /beforeinstallprompt/);
  assert.match(installGuide, /appinstalled/);
  assert.match(installGuide, /display-mode: standalone/);
  assert.match(installGuide, /tachocommand-locale/);
});

test("PWA identity opens the TachoCommand shell instead of the legacy field-test start URL", () => {
  assert.equal(manifest.name, "TachoCommand — Driver Cockpit");
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#020304");
  assert.match(serviceWorker, /tachocommand-shell-v32-oled-landing/);
  assert.match(serviceWorker, /CORE_ASSETS = \["\/", "\/field-test"/);
  assert.match(serviceWorker, /caches\.match\("\/"\)/);
});
