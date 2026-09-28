import { PRODUCT_ANALYTICS_RETENTION_DAYS } from "./product-analytics.js";
import { TECHNICAL_TELEMETRY_RETENTION_DAYS } from "./technical-telemetry.js";

const DAY_SECONDS = 24 * 60 * 60;

/** A daily trigger runs before the published maximum retention periods. */
export async function purgeExpiredTechnicalEvents(db, nowMs = Date.now()) {
  const nowSeconds = Math.floor(nowMs / 1000);
  if (!Number.isFinite(nowSeconds) || !db?.batch || !db?.prepare) {
    throw new Error("Retention cleanup needs the production D1 binding and a valid clock");
  }
  // Allow a day for a delayed run without crossing the stated 60/90-day maximum.
  const technicalCutoff = nowSeconds - (TECHNICAL_TELEMETRY_RETENTION_DAYS - 2) * DAY_SECONDS;
  const analyticsCutoff = nowSeconds - (PRODUCT_ANALYTICS_RETENTION_DAYS - 2) * DAY_SECONDS;
  return db.batch([
    db.prepare("DELETE FROM technical_telemetry_events WHERE created_at < ?").bind(technicalCutoff),
    db.prepare("DELETE FROM product_analytics_events WHERE created_at < ?").bind(analyticsCutoff),
  ]);
}
