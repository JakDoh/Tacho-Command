import assert from "node:assert/strict";
import test from "node:test";

import { readFile } from "node:fs/promises";

test("card transport-controller bridge delegates persistence truth to the existing controller", async () => {
  const source = await readFile(
    new URL("../lib/app-v2-card-transport-controller-bridge.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /runAppV2CardRead/);
  assert.match(source, /readBrowserAppV2GoldenCardPayload/);
  assert.match(source, /return transportResult\.payload/);

  for (const forbidden of [
    "localStorage",
    "setItem(",
    "saveLastGoodCardSnapshot",
    "parseAppV2CardPayload",
    "processAppV2ParsedCard",
    "navigator.bluetooth",
    "requestDevice",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden + " must stay outside the bridge");
  }
});

test("bridge does not relabel the transport candidate as field-proven", async () => {
  const source = await readFile(
    new URL("../lib/app-v2-card-transport-controller-bridge.js", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /fieldProven\s*:\s*true/);
  assert.doesNotMatch(source, /field-proven/i);
});
