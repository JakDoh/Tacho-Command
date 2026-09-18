export const PRODUCT_ANALYTICS_SCHEMA = "tc-product-analytics-v1";
export const PRODUCT_ANALYTICS_RETENTION_DAYS = 90;
export const PRODUCT_ANALYTICS_MAX_BATCH = 20;
export const PRODUCT_ANALYTICS_VISIT_ID_PATTERN = /^PA-[A-F0-9]{32}$/;

export const PRODUCT_ANALYTICS_EVENTS = Object.freeze([
  "landing_view",
  "app_open",
  "trial_start",
  "trial_success",
  "trial_error",
  "open_app_click",
  "connection_guide_click",
  "locale_change",
]);

export const PRODUCT_ANALYTICS_SURFACES = Object.freeze(["landing", "app", "legal", "other"]);
export const PRODUCT_ANALYTICS_LOCALES = Object.freeze(["sr", "en", "de", "unknown"]);
export const PRODUCT_ANALYTICS_SOURCES = Object.freeze([
  "direct",
  "internal",
  "google",
  "bing",
  "duckduckgo",
  "yahoo",
  "ecosia",
  "social",
  "referral",
]);

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue(value, allowed, fallback = null) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

export function normalizeProductAnalyticsVisitId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return PRODUCT_ANALYTICS_VISIT_ID_PATTERN.test(normalized) ? normalized : null;
}

export function sanitizeProductAnalyticsEvent(input) {
  if (!plainObject(input)) return null;

  const visitId = normalizeProductAnalyticsVisitId(input.visitId);
  const event = enumValue(input.event, PRODUCT_ANALYTICS_EVENTS);
  const surface = enumValue(input.surface, PRODUCT_ANALYTICS_SURFACES);
  const locale = enumValue(input.locale, PRODUCT_ANALYTICS_LOCALES, "unknown");
  const source = enumValue(input.source, PRODUCT_ANALYTICS_SOURCES, "direct");

  if (!visitId || !event || !surface) return null;
  return Object.freeze({ visitId, event, surface, locale, source });
}

export function sanitizeProductAnalyticsBatch(input) {
  if (!Array.isArray(input)) return Object.freeze([]);
  return Object.freeze(
    input
      .slice(0, PRODUCT_ANALYTICS_MAX_BATCH)
      .map(sanitizeProductAnalyticsEvent)
      .filter(Boolean),
  );
}

export function productAnalyticsRetentionCutoffEpochSeconds(nowMs = Date.now()) {
  const now = Number(nowMs);
  if (!Number.isFinite(now)) return null;
  return Math.floor(now / 1000) - PRODUCT_ANALYTICS_RETENTION_DAYS * 24 * 60 * 60;
}
