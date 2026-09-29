"use client";
import Link from "next/link";
import {useEffect,useState} from 'react';
import {emailAuthCopy} from '../../lib/email-auth-copy.js';
import type {Locale} from '../landing-page';
import styles from '../email-access.module.css';
export default function VerifyEmailPage(){
 const [locale,setLocale]=useState<Locale>('en'),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{
   const lang=new URLSearchParams(location.search).get('lang');
   const secret=location.hash.slice(1);
   history.replaceState(null,'',location.pathname+location.search);
   queueMicrotask(()=>{if(lang&&Object.hasOwn(emailAuthCopy,lang))setLocale(lang as Locale);setToken(secret);});
 },[]);
 const t=emailAuthCopy[locale];
 async function confirm(){
  setBusy(true);setError(false);
  try{
   const response=await fetch('/api/auth/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error();
   try{localStorage.setItem('tachocommand-locale',locale);}catch{}
   location.replace('/app');
  }catch{setError(true);setBusy(false);}
 }
 return <main className={styles.panel} lang={locale}><h1>TachoCommand</h1><p>{t.confirmIntro}</p><button disabled={busy||!token} onClick={()=>void confirm()}>{busy?'…':t.confirm}</button>{error&&<p role="alert">{t.invalid}</p>}<p><Link href="/app">{t.back}</Link></p></main>;
}
