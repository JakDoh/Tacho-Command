"use client";
import { useEffect, useState } from "react";
const SERVICE_WORKER_URL = "/sw.js?v=2026-09-28-audit-1";
export default function ServiceWorkerRegister() {
 const [waiting,setWaiting]=useState<ServiceWorker|null>(null);
 const [busy,setBusy]=useState(false);
 const [locale,setLocale]=useState('sr');
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  let cancelled=false;let registration:ServiceWorkerRegistration|undefined;
  const sync=()=>{setBusy(document.documentElement.dataset.tachoBusy==='true');try{setLocale(localStorage.getItem('tachocommand-locale')??'sr');}catch{}};
  const check=()=>{if(!cancelled)setWaiting(registration?.waiting??null);};
  void navigator.serviceWorker.register(SERVICE_WORKER_URL,{updateViaCache:'none'}).then(r=>{
   registration=r;sync();check();
   r.addEventListener('updatefound',()=>r.installing?.addEventListener('statechange',check));
   return r.update();
  }).catch(()=>{});
  const visible=()=>{sync();if(document.visibilityState==='visible')void registration?.update().catch(()=>{});};
  window.addEventListener('tacho-busy-change',sync);document.addEventListener('visibilitychange',visible);
  return()=>{cancelled=true;window.removeEventListener('tacho-busy-change',sync);document.removeEventListener('visibilitychange',visible);};
 },[]);
 const update=()=>{
  if(document.documentElement.dataset.tachoBusy==='true'||!waiting)return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
  waiting.postMessage({type:'ACTIVATE_UPDATE'});
 };
 if(!waiting)return null;
 const label=locale==='de'?'Aktualisierung verfügbar':locale==='en'?'Update available':'Ažuriranje je dostupno';
 const hint=locale==='de'?'Nach dem Auslesen aktualisieren':locale==='en'?'Update after the read completes':'Ažuriranje nakon završetka očitavanja';
 return <aside role="status" style={{padding:12,background:'#153344',color:'#fff'}}><button disabled={busy} onClick={update}>{busy?hint:label}</button></aside>;
}
