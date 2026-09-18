import {
  PRODUCT_ANALYTICS_EVENTS,
  PRODUCT_ANALYTICS_LOCALES,
  PRODUCT_ANALYTICS_SURFACES,
} from "./product-analytics.js";

const VISIT_STORAGE_KEY = "tachocommand.analytics.visit.v1";

function normalizedLocale(value) {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().slice(0, 2);
  return PRODUCT_ANALYTICS_LOCALES.includes(normalized) ? normalized : "unknown";
}

export function productAnalyticsSurfaceForPath(pathname) {
  if (pathname === "/") return "landing";
  if (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/field-test" ||
    pathname.startsWith("/field-test/")
  ) return "app";
  if (pathname === "/privacy" || pathname === "/terms" || pathname === "/impressum") return "legal";
  return "other";
}

export function classifyProductAnalyticsReferrer(referrer, currentHost) {
  if (!referrer) return "direct";
  let url;
  try {
    url = new URL(referrer);
  } catch {
    return "direct";
  }

  const host = url.hostname.toLowerCase();
  const own = typeof currentHost === "string" ? currentHost.toLowerCase().split(":")[0] : "";
  if (own && host === own) return "internal";
  if (host === "google.com" || host.endsWith(".google.com")) return "google";
  if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
  if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com")) return "duckduckgo";
  if (host === "search.yahoo.com" || host.endsWith(".search.yahoo.com")) return "yahoo";
  if (host === "ecosia.org" || host.endsWith(".ecosia.org")) return "ecosia";
  if (
    host === "facebook.com" || host.endsWith(".facebook.com") ||
    host === "instagram.com" || host.endsWith(".instagram.com") ||
    host === "linkedin.com" || host.endsWith(".linkedin.com") ||
    host === "x.com" || host.endsWith(".x.com") ||
    host === "t.co" || host.endsWith(".t.co")
  ) return "social";
  return "referral";
}

function createVisitId() {
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") return null;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return "PA-" + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function currentVisitId() {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(VISIT_STORAGE_KEY);
    if (/^PA-[A-F0-9]{32}$/.test(existing ?? "")) return existing;
    const created = createVisitId();
    if (!created) return null;
    window.sessionStorage.setItem(VISIT_STORAGE_KEY, created);
    return created;
  } catch {
    return createVisitId();
  }
}

function currentLocale() {
  if (typeof window === "undefined") return "unknown";
  try {
    const saved = window.localStorage.getItem("tachocommand-locale");
    if (saved) return normalizedLocale(saved);
  } catch {
    // Locale storage is optional.
  }
  return normalizedLocale(typeof navigator === "undefined" ? "" : navigator.language);
}

export async function trackProductAnalytics(event, options = {}) {
  if (typeof window === "undefined" || typeof fetch !== "function") return { status: "unavailable" };
  if (!PRODUCT_ANALYTICS_EVENTS.includes(event)) return { status: "invalid_event" };

  const visitId = currentVisitId();
  if (!visitId) return { status: "unavailable" };

  const surface = PRODUCT_ANALYTICS_SURFACES.includes(options.surface)
    ? options.surface
    : productAnalyticsSurfaceForPath(window.location.pathname);
  const locale = normalizedLocale(options.locale ?? currentLocale());
  const source = classifyProductAnalyticsReferrer(document.referrer, window.location.host);

  try {
    const response = await fetch("/api/product-analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        events: [{ visitId, event, surface, locale, source }],
      }),
    });
    return { status: response.ok ? "sent" : "rejected" };
  } catch {
    return { status: "network_error" };
  }
}
