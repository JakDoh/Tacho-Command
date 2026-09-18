export type ProductAnalyticsEventName =
  | "landing_view"
  | "app_open"
  | "trial_start"
  | "trial_success"
  | "trial_error"
  | "open_app_click"
  | "connection_guide_click"
  | "locale_change";

export type ProductAnalyticsSurface = "landing" | "app" | "legal" | "other";
export type ProductAnalyticsLocale = "sr" | "en" | "de" | "unknown";
export type ProductAnalyticsSource =
  | "direct"
  | "internal"
  | "google"
  | "bing"
  | "duckduckgo"
  | "yahoo"
  | "ecosia"
  | "social"
  | "referral";

export type ProductAnalyticsEvent = Readonly<{
  visitId: string;
  event: ProductAnalyticsEventName;
  surface: ProductAnalyticsSurface;
  locale: ProductAnalyticsLocale;
  source: ProductAnalyticsSource;
}>;

export declare const PRODUCT_ANALYTICS_SCHEMA: "tc-product-analytics-v1";
export declare const PRODUCT_ANALYTICS_RETENTION_DAYS: 90;
export declare const PRODUCT_ANALYTICS_MAX_BATCH: 20;
export declare const PRODUCT_ANALYTICS_VISIT_ID_PATTERN: RegExp;
export declare const PRODUCT_ANALYTICS_EVENTS: readonly ProductAnalyticsEventName[];
export declare const PRODUCT_ANALYTICS_SURFACES: readonly ProductAnalyticsSurface[];
export declare const PRODUCT_ANALYTICS_LOCALES: readonly ProductAnalyticsLocale[];
export declare const PRODUCT_ANALYTICS_SOURCES: readonly ProductAnalyticsSource[];

export declare function normalizeProductAnalyticsVisitId(value: unknown): string | null;
export declare function sanitizeProductAnalyticsEvent(input: unknown): ProductAnalyticsEvent | null;
export declare function sanitizeProductAnalyticsBatch(input: unknown): readonly ProductAnalyticsEvent[];
export declare function productAnalyticsRetentionCutoffEpochSeconds(nowMs?: number): number | null;
