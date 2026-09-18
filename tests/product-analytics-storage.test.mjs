import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routeSource = fs.readFileSync(new URL("../app/api/product-analytics/route.ts", import.meta.url), "utf8");
const schemaSource = fs.readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");
const observerSource = fs.readFileSync(new URL("../app/product-analytics-observer.tsx", import.meta.url), "utf8");
const landingSource = fs.readFileSync(new URL("../app/landing-page.tsx", import.meta.url), "utf8");
const trialSource = fs.readFileSync(new URL("../app/trial-launcher.tsx", import.meta.url), "utf8");

test("product analytics storage contains only aggregate-navigation dimensions", () => {
  for (const field of ["visitId", "event", "surface", "locale", "source", "createdAt"]) {
    assert.match(schemaSource, new RegExp(`\\b${field}\\b`));
  }
  for (const forbidden of [
    "driverName",
    "cardNumber",
    "registration",
    "latitude",
    "longitude",
    "deviceName",
    "rawBytes",
    "rawPayload",
    "ipAddress",
    "userAgent",
    "pathname",
    "query",
  ]) {
    assert.doesNotMatch(routeSource + schemaSource, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
});

test("analytics ingest sanitizes before D1 and keeps server receipt time", () => {
  assert.match(routeSource, /sanitizeProductAnalyticsBatch\(input\)/);
  assert.match(routeSource, /productAnalyticsRetentionCutoffEpochSeconds/);
  assert.match(routeSource, /db\.delete\(productAnalyticsEvents\)/);
  assert.match(routeSource, /db\.insert\(productAnalyticsEvents\)\.values/);
  assert.match(routeSource, /const createdAt = Math\.floor\(Date\.now\(\) \/ 1000\)/);
  assert.doesNotMatch(routeSource, /request\.headers\.get/);
  assert.doesNotMatch(routeSource, /console\.(log|error|warn)\(/);
});

test("landing observer and CTA hooks cover only agreed product events", () => {
  assert.match(observerSource, /landing_view/);
  assert.match(observerSource, /app_open/);
  assert.match(landingSource, /open_app_click/);
  assert.match(landingSource, /connection_guide_click/);
  assert.match(landingSource, /locale_change/);
  assert.match(trialSource, /trial_start/);
  assert.match(trialSource, /trial_success/);
  assert.match(trialSource, /trial_error/);
});
