import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const landing = await readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8");
const appPage = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

test("public root is a truthful closed-beta landing and /app recovers into the field test", () => {
  assert.match(landing, /ZATVORENA BETA/);
  assert.match(landing, /Kupovina se otvara nakon bete/);
  assert.match(landing, /tahograf ostaje zvanični izvor/i);
  assert.match(appPage, /window\.location\.replace\(`\/field-test/);
});

test("landing offers three languages and never claims iPhone support", () => {
  assert.match(landing, /value="sr"/);
  assert.match(landing, /value="en"/);
  assert.match(landing, /value="de"/);
  assert.match(landing, /iPhone\/Safari i stariji tahografi trenutno nisu podržani/);
});

test("mobile landing bypasses the failing server image optimizer", () => {
  assert.match(landing, /cockpit\.webp/);
  assert.equal((landing.match(/unoptimized/g) ?? []).length, 2);
  assert.doesNotMatch(landing, /screenshots\/cockpit\.png/);
});
