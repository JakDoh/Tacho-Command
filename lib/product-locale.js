import { APP_LANGUAGES } from './product-app-copy.js';

export const PRODUCT_LOCALE_KEY = 'tachocommand-locale';
export const PRODUCT_LOCALE_EVENT = 'tacho-locale-change';

export function normalizeProductLocale(value) {
  const locale = String(value ?? '').trim().toLowerCase().split('-')[0];
  return Object.hasOwn(APP_LANGUAGES, locale) ? locale : null;
}

export function resolveProductLocale({ path = '', search = '', saved, browser } = {}) {
  const route = normalizeProductLocale(path.split('/')[1]);
  const legal = /^\/(privacy|terms|impressum)\/?$/.test(path)
    ? normalizeProductLocale(new URLSearchParams(search).get('lang')) : null;
  return route ?? legal ?? normalizeProductLocale(saved) ?? normalizeProductLocale(browser) ?? 'en';
}

export function readProductLocale() {
  if (typeof window === 'undefined') return 'en';
  let saved;
  try { saved = window.localStorage.getItem(PRODUCT_LOCALE_KEY); } catch {}
  return resolveProductLocale({ path: window.location.pathname, search: window.location.search,
    saved, browser: window.navigator.language });
}

export function publishProductLocale(value) {
  const locale = normalizeProductLocale(value) ?? 'en';
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(PRODUCT_LOCALE_KEY, locale); } catch {}
    document.documentElement.lang = locale;
    window.dispatchEvent(new CustomEvent(PRODUCT_LOCALE_EVENT, { detail: locale }));
  }
  return locale;
}

export function localizedLandingHref(locale, search = '', hash = '') {
  return '/' + (normalizeProductLocale(locale) ?? 'en') + search + hash;
}
