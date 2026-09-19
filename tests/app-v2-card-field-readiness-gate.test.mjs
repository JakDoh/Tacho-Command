import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const goldenUrl = new URL(
  "../docs/field-evidence/2026-09-16/TachoCommand-0.32c-driver-card-slot1-field-test.html",
  import.meta.url,
);

test("pre-field gate keeps preserved golden 0.32c artifact byte-for-byte intact", async () => {
  const bytes = await readFile(goldenUrl);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  assert.equal(
    sha256,
    "cd9caab9829cd1523c68b5cc8725edf81c42ba27c45135a6d00934f49d092908",
  );
});

test("pre-field gate keeps App V2 full-card UI on the controller bridge", async () => {
  const source = await readFile(
    new URL("../app/app-v2/app-v2-client.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /runBrowserAppV2GoldenCardRead/);
  assert.match(source, /result\.status === "accepted"/);
  assert.doesNotMatch(source, /requestDevice\(/);
  assert.doesNotMatch(source, /CARD_SLOT1/);
  assert.doesNotMatch(source, /parseAppV2CardPayload/);
});

test("pre-field gate keeps bridge and controller responsibilities intact", async () => {
  const bridge = await readFile(
    new URL("../lib/app-v2-card-transport-controller-bridge.js", import.meta.url),
    "utf8",
  );
  const controller = await readFile(
    new URL("../lib/app-v2-card-read-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(bridge, /runAppV2CardRead/);
  assert.match(bridge, /readBrowserAppV2GoldenCardPayload/);
  assert.match(controller, /handoffCanonicalAppV2CardPayload/);
  assert.match(controller, /pipelineResult\.status !== "accepted"/);
  assert.doesNotMatch(bridge, /localStorage|saveLastGoodCardSnapshot|parseAppV2CardPayload/);
});

test("pre-field gate keeps browser card transport a candidate until physical validation", async () => {
  const transport = await readFile(
    new URL("../lib/app-v2-golden-card-browser-transport.js", import.meta.url),
    "utf8",
  );

  assert.match(transport, /transportCandidate: "golden-compatible-0\.32c"/);
  assert.match(transport, /fieldProven: false/);
  assert.doesNotMatch(transport, /fieldProven: true/);

  assert.match(transport, /APP_V2_GOLDEN_CARD_COMMANDS\.cardSlot1/);
  assert.match(transport, /APP_V2_GOLDEN_CARD_COMMANDS\.transferExit/);
  assert.match(transport, /APP_V2_GOLDEN_CARD_COMMANDS\.stopCommunication/);
  assert.match(transport, /queueWrite\(credits, \[0xff\]\)/);
});

test("pre-field gate keeps parser and persistence in the accepted handoff path", async () => {
  const handoff = await readFile(
    new URL("../lib/app-v2-card-payload-handoff.js", import.meta.url),
    "utf8",
  );
  const pipeline = await readFile(
    new URL("../lib/app-v2-card-pipeline.js", import.meta.url),
    "utf8",
  );

  assert.match(handoff, /parseAppV2CardPayload/);
  assert.match(handoff, /processAppV2ParsedCard/);
  assert.match(pipeline, /normalizeParserCardResult/);
  assert.match(pipeline, /acceptAppV2CardResult/);
});
