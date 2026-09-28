import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");
const overview = fs.readFileSync(new URL("../app/api/admin/overview/route.ts", import.meta.url), "utf8");
const session = fs.readFileSync(new URL("../app/api/admin/session/route.ts", import.meta.url), "utf8");
const adminPage = fs.readFileSync(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const homePage = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("admin surface is noindex and does not render sensitive product data", () => {
  assert.match(layout, /index:\s*false/);
  assert.match(layout, /follow:\s*false/);
  assert.match(dashboard, /PRIVACY SAFE/);
  assert.match(dashboard, /nema identiteta vozača/);
  assert.match(dashboard, /nema brojeva kartica ili registracija/);
});

test("admin API requires signed session before reading aggregate D1 data", () => {
  assert.match(overview, /verifyAdminSessionToken/);
  assert.match(overview, /status:\s*configured \? "unauthorized" : "unavailable"/);
  assert.match(overview, /COUNT\(DISTINCT visit_id\) AS sessions/);
  assert.match(overview, /COUNT\(DISTINCT COALESCE\(attempt_code, session_id\)\) AS attempts/);
  assert.doesNotMatch(overview, /SELECT \*/);
});

test("admin overview exposes anonymous support-code diagnostics without identity", () => {
  assert.doesNotMatch(overview, /visit_id AS/);
  assert.doesNotMatch(overview, /session_id AS/);
  assert.match(overview, /attempt_code, event, phase, outcome, error_code, packet_count, byte_count/);
  assert.doesNotMatch(overview, /driver_name|card_number|registration|latitude|longitude|raw_bytes/i);
  assert.match(overview, /productRetentionDays:\s*90/);
  assert.match(overview, /technicalRetentionDays:\s*60/);
});

test("admin login uses env secrets and strict HttpOnly session cookie", () => {
  assert.match(session, /ADMIN_ACCESS_KEY/);
  assert.match(session, /ADMIN_SIGNING_SECRET/);
  assert.match(session, /HttpOnly; Secure; SameSite=Strict/);
  assert.doesNotMatch(session, /console\.(log|warn|error)/);
  assert.doesNotMatch(session, /accessKey.*Response\.json/);
});


test("admin surface and APIs are bound to admin.tachocommand.com", () => {
  assert.match(adminPage, /isAdminHost/);
  assert.match(adminPage, /notFound\(\)/);
  assert.match(homePage, /redirect\("\/admin"\)/);
  assert.match(session, /isAdminRequestHost/);
  assert.match(overview, /isAdminRequestHost/);
  assert.match(session, /status:\s*"not_found"/);
  assert.match(overview, /status:\s*"not_found"/);
});
