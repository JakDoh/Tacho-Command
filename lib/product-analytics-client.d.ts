import type {
  ProductAnalyticsEventName,
  ProductAnalyticsLocale,
  ProductAnalyticsSource,
  ProductAnalyticsSurface,
} from "./product-analytics.js";

export declare function productAnalyticsSurfaceForPath(pathname: string): ProductAnalyticsSurface;
export declare function classifyProductAnalyticsReferrer(referrer: string, currentHost: string): ProductAnalyticsSource;
export declare function trackProductAnalytics(
  event: ProductAnalyticsEventName,
  options?: Readonly<{ locale?: ProductAnalyticsLocale | string; surface?: ProductAnalyticsSurface }>,
): Promise<Readonly<{ status: "sent" | "rejected" | "network_error" | "unavailable" | "invalid_event" }>>;
