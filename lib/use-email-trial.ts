"use client";
import {useCallback, useEffect, useRef, useState} from 'react';
export type EmailTrial = {status:'loading'|'not_started'|'active'|'owner'|'expired'|'unavailable'; remainingSeconds?:number; expiresAt?:number; serverNow?:number};
export function useEmailTrial(onExpire:()=>void) {
  const [access,setAccess] = useState<EmailTrial>({status:'loading'});
  const permission = useRef(false);
  const deadline = useRef(0);
  const onExpireRef = useRef(onExpire);
  const refreshing = useRef(false);
  const accessStatus = useRef<EmailTrial['status']>('loading');
  useEffect(()=>{ onExpireRef.current = onExpire; },[onExpire]);
  const permitsNow = useCallback(()=>permission.current && performance.now() < deadline.current,[]);
  const refresh = useCallback(async()=>{
    if (refreshing.current) return;
    refreshing.current = true;
    const started = performance.now();
    try {
      const response = await fetch('/api/trial',{cache:'no-store', signal:AbortSignal.timeout(10000)});
      const next = await response.json() as EmailTrial;
      if (!response.ok) throw new Error('unavailable');
      if (next.status === 'owner') {
        deadline.current = Number.POSITIVE_INFINITY;
        permission.current = true;
      } else if (next.status === 'active' && typeof next.remainingSeconds === 'number' && next.remainingSeconds > 0 && next.remainingSeconds <= 259200) {
        // Subtract full request duration conservatively; the phone's wall clock cannot extend access.
        deadline.current = started + next.remainingSeconds * 1000;
        permission.current = performance.now() < deadline.current;
      } else {
        permission.current = false;
        if (deadline.current) onExpireRef.current();
        deadline.current = 0;
      }
      accessStatus.current = next.status;
      setAccess(next);
    } catch {
      // Keep a verified owner session usable while connectivity drops during a read.
      if (accessStatus.current !== 'owner') permission.current = false;
      setAccess(accessStatus.current === 'owner' ? {status:'owner'} : {status:'unavailable'});
    } finally { refreshing.current = false; }
  },[]);
  useEffect(()=>{
    const initial = window.setTimeout(()=>void refresh(),0);
    const interval = window.setInterval(()=>void refresh(),60000);
    const expire = () => {
      if (!deadline.current) return;
      const remaining = Math.max(0,Math.ceil((deadline.current-performance.now())/1000));
      if (remaining === 0) {
        permission.current = false; deadline.current = 0;
        onExpireRef.current(); setAccess({status:'expired',remainingSeconds:0});
      } else setAccess(previous=>previous.status === 'active' ? {...previous,remainingSeconds:remaining} : previous);
    };
    const tick = window.setInterval(expire,1000);
    const visible = () => { expire(); if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange',visible);
    return ()=>{ clearTimeout(initial); clearInterval(interval); clearInterval(tick); document.removeEventListener('visibilitychange',visible); permission.current=false; };
  },[refresh]);
  return {access, refresh, permitsNow};
}
