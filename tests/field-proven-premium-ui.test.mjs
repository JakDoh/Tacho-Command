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

test("V3 keeps driver-facing language concise", () => {
  for (const phrase of [
    "Poveži tahograf",
    "Očitaj karticu",
    "DVE NEDELJE",
    "Nema trenutnog upozorenja.",
    "Kartica je bezbedno očitana",
    "Podaci ostaju na telefonu",
  ]) {
    assert.ok(client.includes(phrase), phrase + " must be present");
  }
  for (const removed of ["DTCO F99A", "DTCO F99B", "14 DANA", "JEZIK APLIKACIJE"]) {
    assert.equal(client.includes(removed), false, removed + " must stay out of the V3 driver surface");
  }
});

test("V3 separates the primary LIVE action from the occasional card read", () => {
  assert.ok(client.includes("onClick={controls.onConnect}"));
  assert.ok(client.includes("onClick={controls.onReadCard}"));
  assert.ok(client.includes("Osveži LIVE"));
  assert.ok(client.includes("Očitaj karticu"));
  assert.equal(client.includes("Pošalji dijagnostiku"), false);
  assert.equal(client.includes("Šifra pokušaja:"), false);
});

test("card read shows truthful live transfer counters without a fabricated total", () => {
  assert.ok(client.includes("Paketi: {cardProgress.submessages}"));
  assert.ok(client.includes("cardProgress.byteLength / 1000"));
  assert.ok(client.includes('aria-live="polite"'));
  assert.ok(css.includes(".cardTransferTrack"));
  assert.ok(client.includes("cardProgress?.complete"));
  assert.ok(client.includes('style={{ width: String(cardVisualProgress) + "%" }}'));
  assert.equal(client.includes("/ 269"), false);
});

test("header follows connection and saved-card state instead of staying offline", () => {
  for (const status of ["POVEZIVANJE", "OČITAVANJE", "LIVE", "SAČUVANO", "OFFLINE"]) {
    assert.ok(client.includes(status));
  }
  assert.ok(client.includes('state.cardReadComplete ? "Kartica očitana"'));
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

test("visual source uses clearer panel lines and state-driven continuous-driving colors", () => {
  assert.ok(css.includes("--tc-panel-line: 1.5px"));
  assert.ok(css.includes("border: var(--tc-panel-line)"));
  assert.ok(css.includes(".progressFill"));
  for (const visualClass of [
    ".progressNeutral",
    ".progressSafe",
    ".progressWarning",
    ".progressLimit",
  ]) {
    assert.ok(css.includes(visualClass), visualClass + " must be present");
  }
  assert.ok(client.includes("state.continuousBand"));
  assert.ok(client.includes("styles.progressWarning"));
  assert.ok(client.includes("styles.progressLimit"));
});

test("history rows expose a 24-hour day detail without inventing missing card events", () => {
  assert.ok(client.includes("DETALJ DANA"));
  assert.ok(client.includes("Velike crte su sati, srednje 30 min, male 15 min."));
  assert.ok(client.includes("Kartica ubačena"));
  assert.ok(client.includes("Kartica izvađena"));
  assert.ok(client.includes("TachoCommand ga ne izmišlja."));
  assert.ok(client.includes("Provera vozila"));
  assert.ok(client.includes("segment.startMinute"));
  assert.ok(client.includes("segment.endMinute"));
  assert.ok(css.includes(".dayRuler"));
  assert.ok(css.includes(".hourTick"));
  assert.ok(css.includes(".halfHourTick"));
  assert.ok(css.includes(".quarterHourTick"));
});


test("day detail refuses to draw a fake 24-hour position when timing provenance is missing", () => {
  assert.ok(client.includes("Apsolutna vremena za ovaj dan nisu potvrđena."));
  assert.ok(client.includes("TachoCommand prikazuje trajanja aktivnosti, ali ne izmišlja poziciju na 24-časovnoj liniji."));
  assert.ok(client.includes("Vreme nije potvrđeno"));
  assert.ok(client.includes("day.timingComplete"));
});

test("56-day overview uses a real 00-to-24-hour axis instead of proportional activity packing", () => {
  assert.ok(client.includes("historyTimelineWrap"));
  assert.ok(client.includes("historyHourLabels"));
  assert.ok(client.includes("<span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>"));
  assert.ok(client.includes("left: String((segment.startMinute / 1440) * 100)"));
  assert.ok(client.includes("width: String(((segment.endMinute - segment.startMinute) / 1440) * 100)"));
  assert.equal(client.includes("width: String(clampPercent(segment.percent))"), false);
  assert.ok(client.includes("day.timingComplete ? styles.timeline : styles.timelineUnverified"));
  assert.ok(client.includes("vreme nije potvrđeno"));
  assert.ok(css.includes(".historyTimelineWrap"));
  assert.ok(css.includes(".historyHourLabels"));
  assert.ok(css.includes(".timeline > span { position: absolute"));
});
