// Only coarse product usage is sent. Never pass card data, diagnostics or identifiers here.
export const GA4_ID = 'G-MFSVXSN9VV';
export const GA4_CONSENT_KEY = 'tachocommand.ga4-consent.v1';
export const GA4_EVENTS = Object.freeze(['app_open','open_app_click','connection_guide_click','card_read_start','card_read_success','card_read_error','card_read_cancelled']);
const paths = /^\/(?:sr|en|de|ru|bg|ro|hu|app|app-v2|privacy|terms|impressum)?$/;
let consent = null;
let initialized = false;
let lastPage = null;
function eligible() {
  return typeof window !== 'undefined' && window.location.hostname === 'tachocommand.com' && paths.test(window.location.pathname);
}
export function ga4Consent() {
  if (consent !== null) return consent;
  try { const value = window.localStorage.getItem(GA4_CONSENT_KEY); return ['granted','denied'].includes(value) ? value : null; } catch { return null; }
}
export function safeGa4Context(href, referrer = '') {
  const url = new URL(href);
  const context = { page_location: 'https://tachocommand.com' + (paths.test(url.pathname) ? url.pathname : '/'), page_title: url.pathname === '/app' || url.pathname === '/app-v2' ? 'TachoCommand App' : 'TachoCommand', page_referrer: '' };
  try { const ref = new URL(referrer); if (['http:','https:'].includes(ref.protocol)) context.page_referrer = ref.origin; } catch {}
  const allow = {
    utm_source: ['instagram','tiktok','x'],
    utm_medium: ['social','paid_social'],
    utm_campaign: ['beta_nov2026'],
    utm_content: ['demo','bio','story'],
  };
  const names = { utm_source:'campaign_source',utm_medium:'campaign_medium',utm_campaign:'campaign_name',utm_content:'campaign_content' };
  for (const [key, values] of Object.entries(allow)) {
    const value = url.searchParams.get(key);
    if (values.includes(value)) context[names[key]] = value;
  }
  return context;
}
function gtag() { window.dataLayer.push(arguments); }
export function startGa4() {
  if (!eligible() || ga4Consent() !== 'granted') return false;
  if (initialized) {
    window['ga-disable-' + GA4_ID] = false;
    return true;
  }
  window['ga-disable-' + GA4_ID] = false;
  window.dataLayer = window.dataLayer || [];
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('consent','update',{analytics_storage:'granted'});
  gtag('js',new Date());
  gtag('config',GA4_ID,{...safeGa4Context(window.location.href,document.referrer),send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_prefix:'tcga',cookie_expires:7776000});
  const script = document.createElement('script');
  script.id = 'tc-ga4'; script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(script);
  initialized = true;
  return true;
}
export function ga4PageView() {
  try {
  if (!startGa4()) return;
  const context = safeGa4Context(window.location.href,document.referrer);
  if (context.page_location === lastPage) return;
  lastPage = context.page_location;
  gtag('set',context);
  gtag('event','page_view',context);
  if (['/app','/app-v2'].includes(window.location.pathname)) trackGa4('app_open');
  } catch {}
}
export function trackGa4(event) {
  try {
    if (!GA4_EVENTS.includes(event) || !startGa4()) return false;
    gtag('event',event,safeGa4Context(window.location.href,document.referrer));
    return true;
  } catch { return false; } // Measurement must never disrupt a read.
}
export function setGa4Consent(value) {
  if (!['granted','denied'].includes(value)) return;
  consent = value;
  try { window.localStorage.setItem(GA4_CONSENT_KEY,value); } catch {}
  if (value === 'granted') {
    if (initialized) gtag('consent','update',{analytics_storage:'granted'});
    ga4PageView(); return;
  }
  window['ga-disable-' + GA4_ID] = true;
  // Block pending tags/events and remove only our analytics cookies.
  if (initialized) {
    window.dataLayer.length = 0;
    gtag('consent','update',{analytics_storage:'denied'});
  }
  lastPage = null;
  for (const item of document.cookie.split(';')) {
    const name = item.trim().split('=')[0];
    if (!/^tcga(?:_|$)/.test(name)) continue;
    for (const domain of ['', '; domain=tachocommand.com', '; domain=.tachocommand.com']) {
      document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax; Secure';
    }
  }

}

export function syncGa4Consent() {
  consent = null;
  const value = ga4Consent();
  setGa4Consent(value === 'granted' ? 'granted' : 'denied');
}
