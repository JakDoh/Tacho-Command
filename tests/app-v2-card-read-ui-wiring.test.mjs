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

  assert.match(source, /if \(cardSession\.busy \|\| cardReadBusyRef\.current \|\| liveRunState === "running"\) return/);
  assert.match(source, /if \(liveRunState === "running" \|\| cardSession\.busy \|\| cardReadBusyRef\.current\) return/);
  assert.match(source, /cardSession\.busy\s*\? "card-reading"/);
  assert.match(source, /liveRunState === "running"\s*\? "connecting"/);
});

test("App V3 reuses the LIVE device for card reading after bounded teardown", async () => {
  const source = await readFile(clientUrl, "utf8");
  assert.match(source, /keepTransportOpen: true/);
  const retainedDeviceAt = source.indexOf("const selectedCardDevice = transport.device");
  const stationaryAt = source.indexOf("await transport.assertStationary()", retainedDeviceAt);
  const closeAt = source.indexOf("await closeLiveForCard(transport)", retainedDeviceAt);
  const cardReadAt = source.indexOf("await runBrowserAppV2GoldenCardRead", retainedDeviceAt);
  assert.ok(retainedDeviceAt >= 0, "card read must retain the LIVE Bluetooth device");
  assert.ok(stationaryAt > retainedDeviceAt, "stationary guard must follow retained-device validation");
  assert.ok(closeAt > stationaryAt, "LIVE must close after the stationary guard");
  assert.ok(cardReadAt > closeAt, "card transport must start only after bounded LIVE close");
  assert.doesNotMatch(source, /selectBrowserAppV2GoldenCardDevice/);
  assert.match(source, /transport\.assertStationary\(\)/);
  assert.match(source, /LIVE_TEARDOWN_TIMEOUT_MS = 1500/);
  assert.match(source, /Promise\.race\(\[/);
  assert.match(source, /transport\.device\?\.gatt\?\.disconnect\?\.\(\)/);
  assert.match(source, /await closeLiveForCard\(transport\)/);
  assert.match(source, /LIVE_TO_CARD_SETTLE_MS = 5000/);
  assert.match(source, /device: selectedCardDevice/);
  assert.match(source, /disconnectOnFinish: true/);
  assert.match(source, /window\.setInterval/);
  assert.match(source, /setLiveConnected\(true\)/);
  assert.match(source, /connected: liveConnected/);
  assert.match(source, /\["live", "incomplete"\]\.includes\(result\.status\)/);
  assert.match(source, /refreshed\.status === "incomplete"/);
});

test("App V3 drains the LIVE monitor before starting the card handoff", async () => {
  const source = await readFile(clientUrl, "utf8");
  const freezeAt = source.indexOf("cardReadBusyRef.current = true");
  const stopAt = source.indexOf("stopSpeedGuard()", freezeAt);
  const drainAt = source.indexOf("await waitForLiveMonitorIdle", stopAt);
  const stationaryAt = source.indexOf("await transport.assertStationary()", drainAt);
  const closeAt = source.indexOf("await closeLiveForCard(transport)", stationaryAt);

  assert.ok(freezeAt >= 0, "card handoff must block new LIVE refreshes immediately");
  assert.ok(stopAt > freezeAt, "LIVE timers must stop after the handoff lock");
  assert.ok(drainAt > stopAt, "an in-flight LIVE request must drain after timers stop");
  assert.ok(stationaryAt > drainAt, "the final stationary check must run after the monitor is idle");
  assert.ok(closeAt > stationaryAt, "LIVE must close only after the final stationary check");
  assert.match(source, /LIVE_MONITOR_IDLE_TIMEOUT_MS = 10000/);
  assert.match(source, /LIVE_MONITOR_IDLE_POLL_MS = 50/);
  assert.match(source, /liveTransportRef\.current !== transport/);
});

test("App V3 holds a screen wake lock only while the card read is active", async () => {
  const source = await readFile(clientUrl, "utf8");
  assert.match(source, /wakeLock\?\.request\("screen"\)/);
  assert.match(source, /lock\?\.release\(\)/);
  assert.match(source, /\.finally\(async \(\) =>/);
});

test("App V2 derives visible LIVE state from the retained transport", async () => {
  const clientSource = await readFile(clientUrl, "utf8");
  const uiSource = await readFile(
    new URL("../app/app/field-proven-premium-ui.tsx", import.meta.url),
    "utf8",
  );

  assert.match(clientSource, /setLiveConnected\(false\)/);
  assert.match(clientSource, /liveConnected\s*\? "connected"/);
  assert.match(uiSource, /Veza je uspostavljena/);
  assert.match(uiSource, /LIVE · potvrđeni podaci/);
  assert.match(uiSource, /c\.phase\s*===\s*['"]connected['"]/);
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
