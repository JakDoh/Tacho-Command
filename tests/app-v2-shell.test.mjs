import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/app-v2/page.tsx", import.meta.url), "utf8");
const client = await readFile(new URL("../app/app-v2/app-v2-client.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/app-v2/app-v2.module.css", import.meta.url), "utf8");
const legacyApp = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

test("production app route composes the proven client behind the V3 presentation", () => {
  assert.ok(page.includes("AppV2Client"));
  assert.ok(client.includes("runBrowserAppV2GoldenCardRead"));
  assert.ok(legacyApp.includes("AppV2Client"));
  assert.equal(legacyApp.includes("window.location.replace"), false);
});

test("app v2 restores only the last fully good parsed card snapshot", () => {
  assert.ok(client.includes("loadLastGoodCardSnapshot"));
  assert.ok(client.includes("cardStateFromLastGoodCardSnapshot"));
  assert.ok(client.includes("createFieldProvenProductState"));
  assert.ok(client.includes("restoreState"));
  assert.ok(client.includes("restoredLabel"));
});

test("app v2 composes the premium instrument and shared release identity", () => {
  assert.ok(client.includes("FieldProvenPremiumUi"));
  assert.ok(client.includes("runAppV2LiveAttemptWithTelemetry"));
  assert.ok(client.includes("formatTachoCommandVersionLine"));
  assert.ok(client.includes("onConnect: runLiveRead"));
  assert.ok(css.includes(".instrumentFrame"));
  assert.equal(css.includes("linear-gradient"), false);
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
