export const GA4_ID: string;
export const GA4_CONSENT_KEY: string;
export const GA4_EVENTS: readonly string[];
export function ga4Consent(): 'granted' | 'denied' | null;
export function ga4PageView(): void;
export function startGa4(): boolean;
export function trackGa4(event: string): boolean;
export function setGa4Consent(value: 'granted' | 'denied'): void;
export function safeGa4Context(href: string, referrer?: string): Record<string,string>;

export function syncGa4Consent(): void;
