"use client";
import {useEffect,useState} from 'react';
import {readProductLocale, PRODUCT_LOCALE_KEY, PRODUCT_LOCALE_EVENT} from '../lib/product-locale.js';
import {usePathname} from 'next/navigation';
import {ga4Consent,ga4PageView,setGa4Consent,syncGa4Consent,GA4_CONSENT_KEY} from '../lib/ga4-client.js';
const copy: Record<string, string[]> = {
 sr:['Opciona analitika','Uz tvoju dozvolu Google Analytics koristi kolačiće da meri posete, izvor dolaska i uspeh korišćenja aplikacije. Ne šaljemo ime, podatke kartice ni istoriju vožnje. Aplikacija radi i bez pristanka.','Dozvoli analitiku','Odbij','Podešavanja analitike','Privatnost','Zatvori'],
 en:['Optional analytics','With your permission, Google Analytics uses cookies to measure visits, traffic sources and app usage outcomes. We do not send your name, card data or driving history. The app works without consent.','Allow analytics','Decline','Analytics settings','Privacy','Close'],
 de:['Optionale Analyse','Mit deiner Zustimmung nutzt Google Analytics Cookies, um Besuche, Zugriffsquellen und Nutzungsergebnisse zu messen. Name, Kartendaten und Fahrhistorie werden nicht gesendet. Die App funktioniert auch ohne Zustimmung.','Analyse erlauben','Ablehnen','Analyse-Einstellungen','Datenschutz','Schließen'],
 ru:['Необязательная аналитика','С вашего согласия Google Analytics использует cookie для измерения посещений, источников и результатов использования. Имя, данные карты и история вождения не передаются. Приложение работает без согласия.','Разрешить','Отклонить','Настройки аналитики','Конфиденциальность','Закрыть'],
 bg:['Незадължителен анализ','С ваше съгласие Google Analytics използва бисквитки за посещения, източници и резултати от използването. Не изпращаме име, данни от картата или история на шофиране. Приложението работи и без съгласие.','Разреши','Откажи','Настройки за анализ','Поверителност','Затвори'],
 ro:['Analiză opțională','Cu acordul tău, Google Analytics folosește cookie-uri pentru vizite, surse de trafic și rezultatele utilizării. Nu trimitem numele, datele cardului sau istoricul condusului. Aplicația funcționează fără acord.','Permite','Refuză','Setări de analiză','Confidențialitate','Închide'],
 hu:['Opcionális analitika','Engedélyeddel a Google Analytics sütikkel méri a látogatásokat, forrásokat és használati eredményeket. Nevet, kártyaadatokat és vezetési előzményeket nem küldünk. Az alkalmazás hozzájárulás nélkül is működik.','Engedélyezés','Elutasítás','Analitikai beállítások','Adatvédelem','Bezárás']
};
export default function AnalyticsConsent() {
 const path=usePathname(); const [visible,setVisible]=useState(false); const [enabled,setEnabled]=useState(false); const [busy,setBusy]=useState(false); const [locale,setLocale]=useState('en');
 useEffect(()=>{
  const sync=()=>{
   const allowed=location.hostname==='tachocommand.com' && /^\/(?:sr|en|de|ru|bg|ro|hu|app|app-v2|privacy|terms|impressum)?$/.test(location.pathname);
   setEnabled(allowed); setBusy(document.documentElement.dataset.tachoBusy==='true');
   setLocale(readProductLocale());
  };
  const frame=requestAnimationFrame(()=>{sync();setVisible(ga4Consent()===null);ga4PageView();});
  const changed=(event:StorageEvent)=>{if(event.key===GA4_CONSENT_KEY){syncGa4Consent();setVisible(false);} if(event.key===PRODUCT_LOCALE_KEY)sync();};
  window.addEventListener('tacho-busy-change',sync);window.addEventListener('storage',changed);window.addEventListener(PRODUCT_LOCALE_EVENT,sync);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('tacho-busy-change',sync);window.removeEventListener('storage',changed);window.removeEventListener(PRODUCT_LOCALE_EVENT,sync);};
 },[path]);
 const t=copy[locale]??copy.en;
 if(!enabled||busy)return null;
 const choose=(value:'granted'|'denied')=>{setGa4Consent(value);setVisible(false);};
 return <><button className="tc-analytics-settings" onClick={()=>setVisible(true)}>{t[4]}</button>{visible&&<section className="tc-analytics-consent" role="region" aria-label={t[0]}><strong>{t[0]}</strong><p>{t[1]}</p><div><button onClick={()=>choose('granted')}>{t[2]}</button><button onClick={()=>choose('denied')}>{t[3]}</button><a href={'/privacy?lang='+locale}>{t[5]}</a><button aria-label={t[6]} onClick={()=>setVisible(false)}>×</button></div></section>}</>;
}
