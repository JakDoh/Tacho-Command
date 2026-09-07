import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const landing = await readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8");
const appPage = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

test("public root is a truthful closed-beta landing and /app recovers into the field test", () => {
  assert.match(landing, /UZAVŘENÁ BETA/);
  assert.match(landing, /Nákup se otevře po skončení bety/);
  assert.match(landing, /tachograf zůstává oficiálním zdrojem/i);
  assert.match(appPage, /window\.location\.replace\(`\/field-test/);
});

test("landing offers three languages and never claims iPhone support", () => {
  assert.match(landing, /value="cs"/);
  assert.match(landing, /value="en"/);
  assert.match(landing, /value="de"/);
  assert.match(landing, /iPhone\/Safari a starší tachografy nejsou v současné době podporovány/);
});

test("mobile landing bypasses the failing server image optimizer", () => {
  assert.match(landing, /cockpit\.webp/);
  assert.equal((landing.match(/unoptimized/g) ?? []).length, 2);
  assert.doesNotMatch(landing, /screenshots\/cockpit\.png/);
});
