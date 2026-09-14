import assert from "node:assert/strict";
import test from "node:test";
import { createUdsResponseCollector, udsResponseMatchesRequest } from "../lib/tacho-uds.js";

test("matches positive and negative UDS responses to the request", () => {
  assert.equal(udsResponseMatchesRequest([0x22, 0xf9, 0x03], [0x62, 0xf9, 0x03, 0x03]), true);
  assert.equal(udsResponseMatchesRequest([0x22, 0xf9, 0x03], [0x62, 0xf9, 0x23, 0x00, 0x2a]), false);
  assert.equal(udsResponseMatchesRequest([0x22, 0xf9, 0x03], [0x7f, 0x22, 0x31]), true);
  assert.equal(udsResponseMatchesRequest([0x3e, 0x00], [0x7e, 0x00]), true);
});

test("returns a single-packet response in the existing framed shape", () => {
  const collector = createUdsResponseCollector([0x3e, 0x00]);
  assert.deepEqual(collector.push([0x01, 0x01, 0x7e, 0x00]), {
    status: "complete",
    reason: null,
    response: [0x01, 0x01, 0x7e, 0x00],
  });
});

test("waits for every ITS fragment before completing a UDS response", () => {
  const collector = createUdsResponseCollector([0x22, 0xf9, 0x23]);
  assert.deepEqual(collector.push([0x02, 0x01, 0x62, 0xf9, 0x23, 0x01]), {
    status: "pending",
    reason: null,
    response: null,
  });
  assert.deepEqual(collector.push([0x00, 0x02, 0x0e]), {
    status: "complete",
    reason: null,
    response: [0x01, 0x01, 0x62, 0xf9, 0x23, 0x01, 0x0e],
  });
});

test("rejects out-of-order continuation packets", () => {
  const collector = createUdsResponseCollector([0x22, 0xf9, 0x23]);
  assert.equal(collector.push([0x02, 0x01, 0x62, 0xf9, 0x23]).status, "pending");
  assert.deepEqual(collector.push([0x00, 0x03, 0x00]), {
    status: "invalid",
    reason: "out-of-order",
    response: null,
  });
});

test("does not complete on an unrelated late response", () => {
  const collector = createUdsResponseCollector([0x22, 0xf9, 0x25]);
  assert.deepEqual(collector.push([0x01, 0x01, 0x62, 0xf9, 0x23, 0x00, 0x2a]), {
    status: "unmatched",
    reason: "response-does-not-match-request",
    response: null,
  });
  assert.deepEqual(collector.push([0x01, 0x01, 0x62, 0xf9, 0x25, 0x00, 0x2d]), {
    status: "complete",
    reason: null,
    response: [0x01, 0x01, 0x62, 0xf9, 0x25, 0x00, 0x2d],
  });
});
