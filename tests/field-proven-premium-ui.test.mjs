import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(new URL("../app/app/field-proven-premium-ui.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/app/field-proven-premium-ui.module.css", import.meta.url), "utf8");
const stateContract = await readFile(new URL("../lib/field-proven-product-state.d.ts", import.meta.url), "utf8");

test("field-proven UI reconstruction exposes all observed product tabs", () => {
  for (const label of ["LIVE", "Periodi", "56 dana", "Pažnja", "Kartica"]) {
    assert.ok(client.includes(label), label + " must be present");
  }
});

test("reconstruction includes observed product language", () => {
  for (const phrase of [
    "Vreme u kontekstu.",
    "Svaki dan, u jednoj liniji.",
    "Prvo ono što traži reakciju.",
    "Status bez izlaganja identiteta.",
    "Kartica je bezbedno očitana",
    "TEHNIČKA DIJAGNOSTIKA",
  ]) {
    assert.ok(client.includes(phrase), phrase + " must be present");
  }
});

test("reconstruction stays data-driven and contains no personal field fixture", () => {
  for (const forbidden of ["Boban Canic", "DTCO-W-5065LO", "6002", "17 h 25 min", "50 h 55 min"]) {
    assert.equal(client.includes(forbidden), false, forbidden + " must not be hard-coded");
  }
  assert.ok(client.includes("FieldProvenProductState"));
  assert.ok(client.includes('from "../../lib/field-proven-product-state.js"'));
  assert.ok(stateContract.includes("historyDays:"));
});

test("reconstruction cannot touch the proven communication motor", () => {
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "writeValue",
    "writeValueWithoutResponse",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "postTechnicalTelemetry",
  ]) {
    assert.equal(client.includes(forbidden), false, forbidden + " must stay outside this source");
  }
});

test("visual source centralizes panel-line thickness for later controlled refinement", () => {
  assert.ok(css.includes("--tc-panel-line: 1px"));
  assert.ok(css.includes("border: var(--tc-panel-line)"));
  assert.ok(css.includes(".progressFill"));
});
