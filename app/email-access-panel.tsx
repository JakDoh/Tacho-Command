"use client";
import {useState, type FormEvent} from 'react';
import {emailAuthCopy} from '../lib/email-auth-copy.js';
import type {EmailTrial} from '../lib/use-email-trial';
import type {Locale} from './landing-page';
import styles from './email-access.module.css';
export default function EmailAccessPanel({locale,access,onRefresh}:{locale:Locale;access:EmailTrial;onRefresh:()=>void}) {
  const t=emailAuthCopy[locale];
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    setBusy(true);setMessage('');
    try {
      const response=await fetch('/api/auth/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:form.get('email'),locale}),signal:AbortSignal.timeout(15000)});
      if(!response.ok) throw new Error();
      setMessage(t.sent);
    } catch {setMessage(t.error);} finally {setBusy(false);}
  }
  if(access.status==='owner') {
    const labels:Record<Locale,string> = {sr:'Puni pristup',en:'Full access',de:'Voller Zugriff',ru:'Полный доступ',bg:'Пълен достъп',ro:'Acces complet',hu:'Teljes hozzáférés'};
    return <aside className={styles.panel} lang={locale}><strong>{labels[locale]}</strong></aside>;
  }
  if(access.status==='active') {
    const seconds=access.remainingSeconds??0;
    return <aside className={styles.panel} lang={locale}><strong>{t.active} · {Math.floor(seconds/3600)}h {Math.floor(seconds%3600/60)}m</strong></aside>;
  }
  return <section className={styles.panel} lang={locale} aria-label={t.title}>
    <h2>{access.status==='expired'?t.expired:access.status==='unavailable'?t.unavailable:access.status==='loading'?t.loading:t.title}</h2>
    <p>{t.intro}</p>
    {access.status!=='loading'&&<form onSubmit={submit}>
      <label htmlFor="auth-email">{t.email}</label>
      <div><input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} required/><button disabled={busy} type="submit">{busy?'…':t.send}</button></div>
    </form>}
    <p role="status">{message}</p><p>{t.history}</p>
    <a href={'/privacy?lang='+locale}>{t.privacy}</a>{' · '}<button type="button" onClick={onRefresh}>{t.refresh}</button>
  </section>;
}
