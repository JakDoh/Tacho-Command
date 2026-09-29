"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {legalCopy} from '../lib/legal-copy.js';
import {APP_LANGUAGES,type AppLocale} from '../lib/product-app-copy.js';
export default function LocalizedLegalPage({kind}:{kind:'privacy'|'terms'|'impressum'}){
 const [locale,setLocale]=useState<AppLocale>('sr');
 useEffect(()=>{
  let saved:string|null=null;try{saved=localStorage.getItem('tachocommand-locale');}catch{}
  const next=new URLSearchParams(location.search).get('lang')??saved;
  if(next&&Object.hasOwn(legalCopy,next))queueMicrotask(()=>setLocale(next as AppLocale));
 },[]);
 const t=legalCopy[locale];
 const index={privacy:0,terms:1,impressum:2}[kind];
 return <main className="legal-shell" lang={locale}>
  <Link className="landing-brand" href={'/'+locale}>TachoCommand</Link>
  <select aria-label="Language / Jezik / Sprache" value={locale} onChange={event=>{
    const next=event.target.value as AppLocale;setLocale(next);try{localStorage.setItem('tachocommand-locale',next);}catch{}
    history.replaceState(null,'','/'+kind+'?lang='+next);
  }}>{Object.entries(APP_LANGUAGES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
  <article><h1>{t.titles[index]}</h1><p className="legal-updated">{t.draft}</p>
    <h2>{t.owner}</h2><address>Boban Canic<br/>Beim Spitzerriegel 2<br/>2500 Baden<br/>{t.country}</address><p>{t.contact}</p>
    {t[kind].map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}
  </article><Link className="legal-back" href={'/'+locale}>← {t.back}</Link>
 </main>;
}
