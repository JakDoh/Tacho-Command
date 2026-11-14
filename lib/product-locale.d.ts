import type { AppLocale } from './product-app-copy.js';
export declare const PRODUCT_LOCALE_KEY: string;
export declare const PRODUCT_LOCALE_EVENT: string;
export declare function normalizeProductLocale(value: unknown): AppLocale | null;
export declare function resolveProductLocale(options?: {path?: string; search?: string; saved?: unknown; browser?: unknown}): AppLocale;
export declare function readProductLocale(): AppLocale;
export declare function publishProductLocale(value: unknown): AppLocale;
export declare function localizedLandingHref(locale: unknown, search?: string, hash?: string): string;
