import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_CANONICAL_HOST,
  isAdminHost,
  normalizeAdminHost,
} from "../lib/admin-host.js";

test("admin host boundary accepts only the canonical production hostname", () => {
  assert.equal(ADMIN_CANONICAL_HOST, "admin.tachocommand.com");
  assert.equal(isAdminHost("admin.tachocommand.com"), true);
  assert.equal(isAdminHost("ADMIN.TACHOCOMMAND.COM:443"), true);
  assert.equal(isAdminHost("tachocommand.com"), false);
  assert.equal(isAdminHost("www.tachocommand.com"), false);
  assert.equal(isAdminHost("evil.example"), false);
});

test("localhost is allowed only when explicitly requested", () => {
  assert.equal(isAdminHost("localhost:3000"), false);
  assert.equal(isAdminHost("localhost:3000", { allowLocalhost: true }), true);
  assert.equal(isAdminHost("127.0.0.1:3000", { allowLocalhost: true }), true);
  assert.equal(isAdminHost("[::1]:3000", { allowLocalhost: true }), true);
});

test("host normalization does not trust forwarded lists or path-like values", () => {
  assert.equal(normalizeAdminHost("admin.tachocommand.com, evil.example"), "admin.tachocommand.com");
  assert.equal(normalizeAdminHost(""), null);
  assert.equal(normalizeAdminHost(null), null);
});
