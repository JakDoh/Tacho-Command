import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const landing = await readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8");
const launcher = await readFile(new URL("../app/trial-launcher.tsx", import.meta.url), "utf8");
const appPage = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

test("public root is a truthful closed-beta landing and /app recovers into the field test", () => {
  assert.match(landing, /ZATVORENA BETA/);
  assert.match(landing, /Kupovina se otvara nakon bete/);
  assert.match(landing, /tahograf ostaje zvanični izvor/i);
  assert.match(landing, /VDO DTCO 4\.1a/);
  assert.match(landing, /data-release=\{LANDING_RELEASE\}/);
  assert.match(appPage, /window\.location\.replace/);
});

test("landing offers three languages and localizes chrome outside image pixels", () => {
  assert.match(landing, /value="sr"/);
  assert.match(landing, /value="en"/);
  assert.match(landing, /value="de"/);
  assert.match(landing, /languageLabel/);
  assert.match(landing, /homeAria/);
  assert.match(landing, /navAria/);
  assert.match(landing, /fieldTestLabel/);
  assert.match(landing, /legal: \{ privacy:/);
  assert.match(launcher, /loadingLabel/);
  assert.match(launcher, /errorLabel/);
});

test("landing does not reuse a Serbian screenshot for every locale", () => {
  assert.doesNotMatch(landing, /screenshots\/cockpit\.(?:webp|png)/);
  assert.match(landing, /previewActivityLabel/);
  assert.match(landing, /previewContinuous/);
  assert.match(landing, /previewBreak/);
});

test("landing does not overclaim unverified field capabilities", () => {
  assert.doesNotMatch(landing, /100% Read-Only/);
  assert.doesNotMatch(landing, /Direct connection to factory Bluetooth on VDO DTCO 4\.0\/4\.1a and Stoneridge SE5000/);
  assert.match(landing, /current field target is VDO DTCO 4\.1a/i);
  assert.match(landing, /history stays in validation/i);
  assert.match(landing, /iPhone\/Safari i stariji tahografi/);
});
