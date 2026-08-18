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
      setMessage("Demo trenutno nije dostupan. Pokušaj ponovo.");
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
        setMessage("Kod nije važeći. Proveri slova i brojeve pa pokušaj ponovo.");
        return;
      }
      setAccess(next);
      cacheAccess(next);
      setShowActivation(false);
    } catch {
      setMessage("Aktivacija trenutno nije dostupna. Pokušaj ponovo.");
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
          <span><i />{access.status === "licensed" ? "BETA LICENCA" : `DEMO • ${remaining}`}</span>
          <div className="access-ribbon-actions">
            {access.status === "active" && (
              <button type="button" onClick={() => { setMessage(""); setShowActivation(true); }}>Aktiviraj kod</button>
            )}
            <Link href="/">Sajt</Link>
          </div>
        </div>
        {showActivation && access.status === "active" && (
          <div className="access-activation-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowActivation(false); }}>
            <section className="access-card access-activation-card" role="dialog" aria-modal="true" aria-labelledby="active-code-title">
              <button className="access-close" type="button" aria-label="Zatvori" onClick={() => setShowActivation(false)}>×</button>
              <span className="beta-badge"><i />BETA LICENCA</span>
              <h1 id="active-code-title">Aktiviraj puni beta pristup.</h1>
              <p>Demo neće biti prekinut ako pogrešiš kod. Nakon uspešne aktivacije aplikacija ostaje otključana na ovom telefonu.</p>
              <form className="activation-form" onSubmit={activate}>
                <label htmlFor="beta-code-active">BETA AKTIVACIONI KOD</label>
                <div>
                  <input id="beta-code-active" name="code" autoComplete="off" autoCapitalize="characters" placeholder="TCB-XXXX-XXXX-XXXXX-XXXXX" required autoFocus />
                  <button type="submit" disabled={busy}>{busy ? "…" : "Aktiviraj"}</button>
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
        <span className="beta-badge"><i />CLOSED BETA • ANDROID</span>
        <h1>{
          access.status === "expired" ? "Tvoj demo je završen." :
          access.status === "unavailable" ? "Provera pristupa nije dostupna." :
          access.status === "loading" ? "Proveravam pristup…" :
          "Spreman za prvu smenu?"
        }</h1>
        <p>{
          access.status === "expired"
            ? "Hvala na testiranju. Ako si član beta grupe, unesi kod koji si dobio."
            : access.status === "unavailable"
              ? "Veza sa beta servisom trenutno nije dostupna. Aktivna aplikacija nastavlja offline samo kada je pristup ranije potvrđen."
              : access.status === "loading"
                ? "Potvrđujem demo ili beta licencu bez prikupljanja ličnih podataka."
                : "Pokreni besplatni demo od 72 sata ili unesi beta kod koji si dobio od TachoCommand tima."
        }</p>

        {access.status === "not_started" && (
          <button className="landing-primary access-start" type="button" onClick={startTrial} disabled={busy}>
            {busy ? "Pokrećem…" : "Pokreni 3-dnevni demo"}
          </button>
        )}

        {access.status !== "loading" && (
          <form className="activation-form" onSubmit={activate}>
            <label htmlFor="beta-code">BETA AKTIVACIONI KOD</label>
            <div>
              <input id="beta-code" name="code" autoComplete="off" autoCapitalize="characters" placeholder="TCB-XXXX-XXXX-XXXXX-XXXXX" required />
              <button type="submit" disabled={busy}>{busy ? "…" : "Aktiviraj"}</button>
            </div>
          </form>
        )}

        {message && <p className="access-error" role="alert">{message}</p>}
        <div className="access-truth"><span>!</span><p>TachoCommand je pomoćni beta-alat. Tokom testa svako vreme proveri na zvaničnom tahografu.</p></div>
      </section>
      <Link className="legal-back" href="/">← Nazad na početnu</Link>
    </main>
  );
}
