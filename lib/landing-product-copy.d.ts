import type { AppLocale } from './product-app-copy.js';
type LandingProductCopy = {
  hero: string; free: string; title: string; intro: string;
  features: [string, string][]; beginnerTitle: string; beginnerBody: string;
  glossary: [string, string][]; note: string;
};
export declare const landingProductCopy: Record<AppLocale, LandingProductCopy>;
