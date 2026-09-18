import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_ANALYTICS_MAX_BATCH,
  PRODUCT_ANALYTICS_RETENTION_DAYS,
  normalizeProductAnalyticsVisitId,
  productAnalyticsRetentionCutoffEpochSeconds,
  sanitizeProductAnalyticsBatch,
  sanitizeProductAnalyticsEvent,
} from "../lib/product-analytics.js";
import {
  classifyProductAnalyticsReferrer,
  productAnalyticsSurfaceForPath,
} from "../lib/product-analytics-client.js";

const VISIT = "PA-0123456789ABCDEF0123456789ABCDEF";

test("product analytics accepts only the small anonymous event contract", () => {
  assert.deepEqual(sanitizeProductAnalyticsEvent({
    visitId: VISIT,
    event: "landing_view",
    surface: "landing",
    locale: "de",
    source: "google",
    driverName: "must disappear",
    cardNumber: "must disappear",
  }), {
    visitId: VISIT,
    event: "landing_view",
    surface: "landing",
    locale: "de",
    source: "google",
  });

  assert.equal(sanitizeProductAnalyticsEvent({
    visitId: "bad",
    event: "landing_view",
    surface: "landing",
  }), null);
  assert.equal(sanitizeProductAnalyticsEvent({
    visitId: VISIT,
    event: "unknown_event",
    surface: "landing",
  }), null);
});

test("visit id normalization is opaque and contains no browser identity", () => {
  assert.equal(normalizeProductAnalyticsVisitId(VISIT.toLowerCase()), VISIT);
  assert.equal(normalizeProductAnalyticsVisitId("PA-1234"), null);
});

test("analytics batch is bounded and defaults only coarse non-identifying enums", () => {
  const input = Array.from({ length: PRODUCT_ANALYTICS_MAX_BATCH + 5 }, () => ({
    visitId: VISIT,
    event: "app_open",
    surface: "app",
    locale: "xx",
    source: "not-a-source",
  }));
  const result = sanitizeProductAnalyticsBatch(input);
  assert.equal(result.length, PRODUCT_ANALYTICS_MAX_BATCH);
  assert.equal(result[0].locale, "unknown");
  assert.equal(result[0].source, "direct");
});

test("referrer classification stores category only, never URL or query", () => {
  assert.equal(classifyProductAnalyticsReferrer("", "tachocommand.com"), "direct");
  assert.equal(classifyProductAnalyticsReferrer("https://tachocommand.com/#why", "tachocommand.com"), "internal");
  assert.equal(classifyProductAnalyticsReferrer("https://www.google.com/search?q=driver+card", "tachocommand.com"), "google");
  assert.equal(classifyProductAnalyticsReferrer("https://example.org/private/path?q=secret", "tachocommand.com"), "referral");
});

test("surface classification separates public landing, app and legal routes", () => {
  assert.equal(productAnalyticsSurfaceForPath("/"), "landing");
  assert.equal(productAnalyticsSurfaceForPath("/app"), "app");
  assert.equal(productAnalyticsSurfaceForPath("/field-test"), "app");
  assert.equal(productAnalyticsSurfaceForPath("/privacy"), "legal");
  assert.equal(productAnalyticsSurfaceForPath("/anything-else"), "other");
});

test("analytics retention is exactly 90 days", () => {
  assert.equal(PRODUCT_ANALYTICS_RETENTION_DAYS, 90);
  const now = Date.parse("2026-09-18T12:00:00Z");
  assert.equal(
    productAnalyticsRetentionCutoffEpochSeconds(now),
    Math.floor(now / 1000) - 90 * 24 * 60 * 60,
  );
});
