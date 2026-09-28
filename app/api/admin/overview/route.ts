import {
  ADMIN_SESSION_COOKIE,
  readCookieValue,
  verifyAdminSessionToken,
} from "../../../../lib/admin-auth.js";
import { isAdminRequestHost } from "../../../../lib/admin-host.js";

type CountRow = Readonly<{ key?: string; count?: number | string | null }>;
type DayRow = Readonly<{
  day?: string | null;
  landing_views?: number | string | null;
  app_opens?: number | string | null;
}>;
type TechnicalRow = Readonly<{
  attempt_code?: string | null;
  event?: string | null;
  phase?: string | null;
  outcome?: string | null;
  error_code?: string | null;
  packet_count?: number | string | null;
  byte_count?: number | string | null;
  duration_ms?: number | string | null;
  created_at?: number | string | null;
}>;

const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });

const numeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const rowsToCounts = (rows: readonly CountRow[]) =>
  Object.fromEntries(
    rows
      .filter((row) => typeof row.key === "string")
      .map((row) => [row.key as string, numeric(row.count)]),
  );

async function authorized(request: Request) {
  const signingSecret = process.env.ADMIN_SIGNING_SECRET?.trim();
  if (!signingSecret) return false;
  return Boolean(await verifyAdminSessionToken(
    signingSecret,
    readCookieValue(request, ADMIN_SESSION_COOKIE),
  ));
}

export async function GET(request: Request) {
  if (!isAdminRequestHost(request)) return json({ status: "not_found" }, { status: 404 });
  if (!(await authorized(request))) {
    const configured = Boolean(process.env.ADMIN_SIGNING_SECRET?.trim());
    return json({ status: configured ? "unauthorized" : "unavailable" }, { status: configured ? 401 : 503 });
  }

  try {
    const { env } = await import("cloudflare:workers");
    if (!env.DB) return json({ status: "storage_unavailable" }, { status: 503 });

    const now = Math.floor(Date.now() / 1000);
    const since30 = now - 30 * 24 * 60 * 60;
    const since14 = now - 14 * 24 * 60 * 60;

    const [
      productSummary,
      eventCounts,
      sourceCounts,
      localeCounts,
      dailyRows,
      technicalSummary,
      outcomeCounts,
      recentTechnicalRows,
    ] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS total_events, COUNT(DISTINCT visit_id) AS sessions, MAX(created_at) AS last_event_at FROM product_analytics_events WHERE created_at >= ?1",
      ).bind(since30).first(),
      env.DB.prepare(
        "SELECT event AS key, COUNT(*) AS count FROM product_analytics_events WHERE created_at >= ?1 GROUP BY event ORDER BY count DESC",
      ).bind(since30).all(),
      env.DB.prepare(
        "SELECT source AS key, COUNT(*) AS count FROM product_analytics_events WHERE created_at >= ?1 GROUP BY source ORDER BY count DESC",
      ).bind(since30).all(),
      env.DB.prepare(
        "SELECT locale AS key, COUNT(*) AS count FROM product_analytics_events WHERE created_at >= ?1 GROUP BY locale ORDER BY count DESC",
      ).bind(since30).all(),
      env.DB.prepare(
        "SELECT strftime('%Y-%m-%d', created_at, 'unixepoch') AS day, SUM(CASE WHEN event = 'landing_view' THEN 1 ELSE 0 END) AS landing_views, SUM(CASE WHEN event = 'app_open' THEN 1 ELSE 0 END) AS app_opens FROM product_analytics_events WHERE created_at >= ?1 GROUP BY day ORDER BY day ASC",
      ).bind(since14).all(),
      env.DB.prepare(
        "SELECT COUNT(*) AS total_events, COUNT(DISTINCT COALESCE(attempt_code, session_id)) AS attempts, MAX(created_at) AS last_event_at FROM technical_telemetry_events WHERE created_at >= ?1",
      ).bind(since30).first(),
      env.DB.prepare(
        "SELECT outcome AS key, COUNT(*) AS count FROM technical_telemetry_events WHERE created_at >= ?1 GROUP BY outcome ORDER BY count DESC",
      ).bind(since30).all(),
      env.DB.prepare(
        "SELECT attempt_code, event, phase, outcome, error_code, packet_count, byte_count, duration_ms, created_at FROM technical_telemetry_events WHERE attempt_code IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 100",
      ).all(),
    ]);

    const productEvents = rowsToCounts((eventCounts.results ?? []) as CountRow[]);
    const sourceEvents = rowsToCounts((sourceCounts.results ?? []) as CountRow[]);
    const localeEvents = rowsToCounts((localeCounts.results ?? []) as CountRow[]);
    const technicalOutcomes = rowsToCounts((outcomeCounts.results ?? []) as CountRow[]);
    const recentTechnical = ((recentTechnicalRows.results ?? []) as TechnicalRow[]).map((row) => ({
      attemptCode: typeof row.attempt_code === "string" ? row.attempt_code : "",
      event: typeof row.event === "string" ? row.event : "unknown",
      phase: typeof row.phase === "string" ? row.phase : "unknown",
      outcome: typeof row.outcome === "string" ? row.outcome : "unknown",
      errorCode: typeof row.error_code === "string" ? row.error_code : null,
      packetCount: numeric(row.packet_count),
      byteCount: numeric(row.byte_count),
      durationMs: numeric(row.duration_ms),
      createdAt: numeric(row.created_at),
    })).filter((row) => row.attemptCode && row.createdAt);

    return json({
      status: "ready",
      generatedAt: now,
      windowDays: 30,
      product: {
        sessions: numeric(productSummary?.sessions),
        totalEvents: numeric(productSummary?.total_events),
        landingViews: productEvents.landing_view ?? 0,
        appOpens: productEvents.app_open ?? 0,
        trialStarts: productEvents.trial_start ?? 0,
        trialSuccesses: productEvents.trial_success ?? 0,
        trialErrors: productEvents.trial_error ?? 0,
        openAppClicks: productEvents.open_app_click ?? 0,
        guideClicks: productEvents.connection_guide_click ?? 0,
        localeChanges: productEvents.locale_change ?? 0,
        lastEventAt: numeric(productSummary?.last_event_at) || null,
        sources: sourceEvents,
        locales: localeEvents,
        daily: ((dailyRows.results ?? []) as DayRow[]).map((row) => ({
          day: typeof row.day === "string" ? row.day : "",
          landingViews: numeric(row.landing_views),
          appOpens: numeric(row.app_opens),
        })).filter((row) => row.day),
      },
      technical: {
        attempts: numeric(technicalSummary?.attempts),
        totalEvents: numeric(technicalSummary?.total_events),
        lastEventAt: numeric(technicalSummary?.last_event_at) || null,
        outcomes: technicalOutcomes,
        recent: recentTechnical,
      },
      privacy: {
        aggregateOnly: true,
        productRetentionDays: 90,
        technicalRetentionDays: 60,
        technicalAttemptDetails: true,
      },
    });
  } catch {
    return json({ status: "storage_unavailable" }, { status: 503 });
  }
}
