import assert from "node:assert/strict";
import test from "node:test";

import { selectAppV2GoldenCardDevice } from "../lib/app-v2-golden-card-browser-transport.js";

test("card device selection delegates immediately to the browser chooser", async () => {
  const device = { name: "DTCO" };
  let options = null;
  const selected = await selectAppV2GoldenCardDevice({
    bluetooth: {
      requestDevice(value) {
        options = value;
        return Promise.resolve(device);
      },
    },
  });

  assert.equal(selected, device);
  assert.equal(options.acceptAllDevices, true);
  assert.ok(options.optionalServices.length > 0);
});

test("card device selection fails closed without Web Bluetooth", () => {
  assert.throws(
    () => selectAppV2GoldenCardDevice(),
    /Web Bluetooth nije dostupan/,
  );
});
