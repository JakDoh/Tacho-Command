"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";

type AccessStatus = {
  status: "loading" | "not_started" | "active" | "expired" | "licensed" | "unavailable";
  expiresAt?: number;
  remainingSeconds?: number;
  tier?: string;
};

const CACHE_KEY = "tachocommand.beta-access.v1";

const readCachedAccess = (): AccessStatus | null => {
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "null") as AccessStatus & { checkedAt?: number };
    if (cached.status === "licensed") return cached;
    if (cached.status === "active" && (cached.expiresAt ?? 0) > Math.floor(Date.now() / 1000)) {
      return {
        ...cached,
        remainingSeconds: Math.max(0, (cached.expiresAt ?? 0) - Math.floor(Date.now() / 1000)),
      };
    }
  } catch {
    window.localStorage.removeItem(CACHE_KEY);
  }
  return null;
};

const cacheAccess = (access: AccessStatus) => {
  if (access.status !== "active" && access.status !== "licensed") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...access, checkedAt: Date.now() }));
};

export default function AccessGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessStatus>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showActivation, setShowActivation] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/trial", { cache: "no-store" });
        const next = await response.json() as AccessStatus;
        setAccess(next);
        cacheAccess(next);
      } catch {
        setAccess(readCachedAccess() ?? { status: "unavailable" });
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const startTrial = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/trial", { method: "POST" });
      if (!response.ok) throw new Error("unavailable");
      const next = await response.json() as AccessStatus;
      setAccess(next);
      cacheAccess(next);
      setShowActivation(false);
    } catch {
      setMessage("Demo v současné době není k dispozici. Zkuste to prosím znovu.");
    } finally {
      setBusy(false);
    }
  };

  const activate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: form.get("code") }),
      });
      const next = await response.json() as AccessStatus;
      if (!response.ok || next.status !== "licensed") {
        setMessage("Kód není platný. Zkontrolujte písmena a číslice a zkuste to znovu.");
        return;
      }
      setAccess(next);
      cacheAccess(next);
      setShowActivation(false);
    } catch {
      setMessage("Aktivace v současné době není k dispozici. Zkuste to prosím znovu.");
    } finally {
      setBusy(false);
    }
  };

  const remaining = useMemo(() => {
    const seconds = access.remainingSeconds ?? 0;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  }, [access]);

  if (access.status === "active" || access.status === "licensed") {
    return (
      <>
        <div className="access-ribbon">
          <span><i />{access.status === "licensed" ? "BETA LICENCE" : `DEMO • ${remaining}`}</span>
          <div className="access-ribbon-actions">
            {access.status === "active" && (
              <button type="button" onClick={() => { setMessage(""); setShowActivation(true); }}>Aktivovat kód</button>
            )}
            <Link href="/">Web</Link>
          </div>
        </div>
        {showActivation && access.status === "active" && (
          <div className="access-activation-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowActivation(false); }}>
            <section className="access-card access-activation-card" role="dialog" aria-modal="true" aria-labelledby="active-code-title">
              <button className="access-close" type="button" aria-label="Zavřít" onClick={() => setShowActivation(false)}>×</button>
              <span className="beta-badge"><i />BETA LICENCE</span>
              <h1 id="active-code-title">Aktivujte plný beta přístup.</h1>
              <p>Demo nebude přerušeno, pokud zadáte chybný kód. Po úspěšné aktivaci zůstane aplikace odemčena na tomto telefonu.</p>
              <form className="activation-form" onSubmit={activate}>
                <label htmlFor="beta-code-active">BETA AKTIVAČNÍ KÓD</label>
                <div>
                  <input id="beta-code-active" name="code" autoComplete="off" autoCapitalize="characters" placeholder="TCB-XXXX-XXXX-XXXXX-XXXXX" required autoFocus />
                  <button type="submit" disabled={busy}>{busy ? "…" : "Aktivovat"}</button>
                </div>
              </form>
              {message && <p className="access-error" role="alert">{message}</p>}
            </section>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <main className="access-shell">
      <div className="access-ambient" />
      <Link className="landing-brand" href="/">
        <span className="landing-logo">TC</span>
        <strong>Tacho<span>Command</span></strong>
      </Link>
      <section className="access-card">
        <span className="beta-badge"><i />UZAVŘENÁ BETA • ANDROID</span>
        <h1>{
          access.status === "expired" ? "Vaše demo skončilo." :
          access.status === "unavailable" ? "Ověření přístupu není k dispozici." :
          access.status === "loading" ? "Ověřuji přístup…" :
          "Připraven na první směnu?"
        }</h1>
        <p>{
          access.status === "expired"
            ? "Děkujeme za testování. Pokud jste členem beta skupiny, zadejte kód, který jste obdrželi."
            : access.status === "unavailable"
              ? "Spojení s beta službou momentálně není k dispozici. Aktivní aplikace pokračuje offline, pouze pokud byl přístup dříve potvrzen."
              : access.status === "loading"
                ? "Ověřuji demo nebo beta licenci bez shromažďování osobních údajů."
                : "Spusťte bezplatné 72hodinové demo nebo zadejte beta kód, který jste obdrželi od týmu TachoCommand."
        }</p>

        {access.status === "not_started" && (
          <button className="landing-primary access-start" type="button" onClick={startTrial} disabled={busy}>
            {busy ? "Spouštím…" : "Spustit 3denní demo"}
          </button>
        )}

        {access.status !== "loading" && (
          <form className="activation-form" onSubmit={activate}>
            <label htmlFor="beta-code">BETA AKTIVAČNÍ KÓD</label>
            <div>
              <input id="beta-code" name="code" autoComplete="off" autoCapitalize="characters" placeholder="TCB-XXXX-XXXX-XXXXX-XXXXX" required />
              <button type="submit" disabled={busy}>{busy ? "…" : "Aktivovat"}</button>
            </div>
          </form>
        )}

        {message && <p className="access-error" role="alert">{message}</p>}
        <div className="access-truth"><span>!</span><p>TachoCommand je pomocný beta nástroj. Během testování každou hodnotu zkontrolujte na oficiálním tachografu.</p></div>
      </section>
      <Link className="legal-back" href="/">← Zpět na úvod</Link>
    </main>
  );
}
