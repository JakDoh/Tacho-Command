import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/app-v2/page.tsx", import.meta.url), "utf8");
const client = await readFile(new URL("../app/app-v2/app-v2-client.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/app-v2/app-v2.module.css", import.meta.url), "utf8");
const legacyApp = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

test("app v2 is isolated from the legacy app route", () => {
  assert.ok(page.includes("AppV2Client"));
  assert.ok(client.includes("APP V2 · FIELD-PROVEN CARD PATH"));
  assert.ok(legacyApp.includes("window.location.replace"));
  assert.equal(legacyApp.includes("AppV2Client"), false);
});

test("app v2 restores only the last fully good parsed card snapshot", () => {
  assert.ok(client.includes("loadLastGoodCardSnapshot"));
  assert.ok(client.includes("cardStateFromLastGoodCardSnapshot"));
  assert.ok(client.includes("createFieldProvenProductState"));
  assert.ok(client.includes("Poslednje dobro očitavanje vraćeno"));
  assert.ok(client.includes("Bez izmišljanja podataka"));
});

test("app v2 composes the premium instrument and shared release identity", () => {
  assert.ok(client.includes("FieldProvenPremiumUi"));
  assert.ok(client.includes("formatTachoCommandVersionLine"));
  assert.ok(client.includes("Instrument spreman. Podaci ostaju tvoji."));
  assert.ok(css.includes(".commandDeck"));
  assert.ok(css.includes(".instrumentFrame"));
  assert.ok(css.includes(".primaryAction"));
});

test("app v2 shell cannot implement or mutate the golden transport", () => {
  const combined = page + "\n" + client + "\n" + css;
  for (const forbidden of [
    "navigator.bluetooth",
    "requestDevice",
    "writeValue",
    "queueGattWrite",
    "buildReadDataByIdentifier",
    "TREP",
    "RequestTransferExit",
    "StopCommunication",
    "postTechnicalTelemetry",
  ]) {
    assert.equal(combined.includes(forbidden), false, forbidden + " must stay outside app v2 shell");
  }
});
