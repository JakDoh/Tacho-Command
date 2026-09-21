import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientUrl = new URL("../app/app-v2/app-v2-client.tsx", import.meta.url);

test("App V3 presentation routes full-card reads through the proven controller bridge", async () => {
  const source = await readFile(clientUrl, "utf8");

  assert.match(source, /runBrowserAppV2GoldenCardRead/);
  assert.match(source, /beginAppV2CardRead/);
  assert.match(source, /storage: window\.localStorage/);
  assert.match(source, /result\.status === "accepted"/);
  assert.match(source, /setCardState\(result\.session\.currentCard\)/);
});

test("App V2 prevents concurrent LIVE and CARD Bluetooth sessions", async () => {
  const source = await readFile(clientUrl, "utf8");

  assert.match(source, /if \(liveRunState === "running" \|\| cardSession\.busy\) return/);
  assert.match(source, /if \(cardSession\.busy \|\| liveRunState === "running"\) return/);
  assert.match(source, /cardSession\.busy\s*\? "card-reading"/);
  assert.match(source, /liveRunState === "running"\s*\? "connecting"/);
});

test("App V2 keeps card transport details out of UI source", async () => {
  const source = await readFile(clientUrl, "utf8");

  for (const forbidden of [
    "requestDevice(",
    "TACHO_DOWNLOAD_SERVICE_UUID",
    "CARD_SLOT1",
    "RequestTransferExit",
    "StopCommunication",
    "buildAppV2GoldenAck",
    "parseAppV2CardPayload",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside UI source");
  }

  assert.match(source, /formatTachoCommandVersionLine/);
  assert.match(source, /onReadCard: runCardRead/);
  assert.match(source, /onProgress: \(progress: CardReadProgress\) => setCardReadProgress\(progress\)/);
  assert.match(source, /cardReadProgress,/);
  assert.match(source, /setRestoreState\("restored"\);\s*return;/);
});
