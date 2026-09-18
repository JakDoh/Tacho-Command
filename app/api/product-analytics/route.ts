import { lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { productAnalyticsEvents } from "../../../db/schema";
import {
  PRODUCT_ANALYTICS_RETENTION_DAYS,
  productAnalyticsRetentionCutoffEpochSeconds,
  sanitizeProductAnalyticsBatch,
} from "../../../lib/product-analytics.js";

const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ status: "invalid_json" }, { status: 400 });
  }

  const input = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as { events?: unknown }).events
    : null;
  const events = sanitizeProductAnalyticsBatch(input);
  if (events.length === 0) {
    return json({ status: "no_valid_events" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const createdAt = Math.floor(Date.now() / 1000);
    const cutoff = productAnalyticsRetentionCutoffEpochSeconds(createdAt * 1000);

    if (cutoff !== null) {
      await db.delete(productAnalyticsEvents).where(lt(productAnalyticsEvents.createdAt, cutoff));
    }

    await db.insert(productAnalyticsEvents).values(
      events.map((event) => ({
        visitId: event.visitId,
        event: event.event,
        surface: event.surface,
        locale: event.locale,
        source: event.source,
        createdAt,
      })),
    );

    return json(
      {
        status: "accepted",
        accepted: events.length,
        retentionDays: PRODUCT_ANALYTICS_RETENTION_DAYS,
      },
      { status: 202 },
    );
  } catch {
    return json({ status: "storage_unavailable" }, { status: 503 });
  }
}
