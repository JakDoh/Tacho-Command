"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./admin.module.css";

type Overview = Readonly<{
  status: "ready";
  generatedAt: number;
  windowDays: number;
  product: Readonly<{
    sessions: number;
    totalEvents: number;
    landingViews: number;
    appOpens: number;
    trialStarts: number;
    trialSuccesses: number;
    trialErrors: number;
    openAppClicks: number;
    guideClicks: number;
    localeChanges: number;
    lastEventAt: number | null;
    sources: Readonly<Record<string, number>>;
    locales: Readonly<Record<string, number>>;
    daily: readonly Readonly<{ day: string; landingViews: number; appOpens: number }>[];
  }>;
  technical: Readonly<{
    attempts: number;
    totalEvents: number;
    lastEventAt: number | null;
    outcomes: Readonly<Record<string, number>>;
  }>;
  privacy: Readonly<{
    aggregateOnly: boolean;
    productRetentionDays: number;
    technicalRetentionDays: number;
  }>;
}>;

const formatNumber = (value: number) => new Intl.NumberFormat("sr-RS").format(value);
const formatTime = (value: number | null) =>
  value
    ? new Intl.DateTimeFormat("sr-RS", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value * 1000))
    : "Nema podataka";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [mode, setMode] = useState<"loading" | "login" | "ready" | "unavailable">("loading");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (response.status === 401) {
        setOverview(null);
        setMode("login");
        return;
      }
      if (!response.ok) {
        setMode("unavailable");
        return;
      }
      const payload = await response.json() as Overview;
      setOverview(payload);
      setMode("ready");
    } catch {
      setMode("unavailable");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const response = await fetch("/api/admin/overview", { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 401) {
          setOverview(null);
          setMode("login");
          return;
        }
        if (!response.ok) {
          setMode("unavailable");
          return;
        }
        const payload = await response.json() as Overview;
        if (cancelled) return;
        setOverview(payload);
        setMode("ready");
      } catch {
        if (!cancelled) setMode("unavailable");
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!response.ok) {
        setError(response.status === 503 ? "Admin pristup još nije konfigurisan." : "Pristupni ključ nije prihvaćen.");
        return;
      }
      setKey("");
      await load();
    } catch {
      setError("Admin servis trenutno nije dostupan.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    setOverview(null);
    setMode("login");
  };

  const maxDaily = useMemo(() => {
    if (!overview) return 1;
    return Math.max(1, ...overview.product.daily.map((row) => Math.max(row.landingViews, row.appOpens)));
  }, [overview]);

  if (mode === "loading") {
    return <main className={styles.center}><div className={styles.loader}>TachoCommand Admin</div></main>;
  }

  if (mode === "login") {
    return (
      <main className={styles.center}>
        <section className={styles.loginCard}>
          <div className={styles.brand}><span>TC</span><div><small>PRIVATE CONTROL PLANE</small><strong>TachoCommand Admin</strong></div></div>
          <h1>Super-user cockpit</h1>
          <p>Samo agregatni podaci o proizvodu. Bez imena vozača, kartica, registracija, lokacije ili raw tahografskih podataka.</p>
          <form onSubmit={login}>
            <label htmlFor="admin-key">Admin access key</label>
            <input id="admin-key" type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="current-password" required minLength={24} />
            <button type="submit" disabled={submitting}>{submitting ? "Proveravam…" : "Otvori cockpit"}</button>
          </form>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </section>
      </main>
    );
  }

  if (mode === "unavailable" || !overview) {
    return (
      <main className={styles.center}>
        <section className={styles.loginCard}>
          <h1>Admin trenutno nije spreman.</h1>
          <p>Auth secret ili analytics storage još nije dostupan na ovom deployment-u.</p>
          <button type="button" onClick={() => void load()}>Pokušaj ponovo</button>
        </section>
      </main>
    );
  }

  const cards = [
    ["Sesije", overview.product.sessions, "30 dana"],
    ["Landing views", overview.product.landingViews, "30 dana"],
    ["App opens", overview.product.appOpens, "30 dana"],
    ["Demo starts", overview.product.trialStarts, "30 dana"],
    ["Demo success", overview.product.trialSuccesses, "30 dana"],
    ["Read attempts", overview.technical.attempts, "30 dana"],
  ] as const;

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>TC</span><div><small>PRIVATE CONTROL PLANE</small><strong>TachoCommand Admin</strong></div></div>
        <div className={styles.topActions}>
          <span className={styles.safeBadge}>AGGREGATE ONLY</span>
          <button type="button" onClick={() => void load()}>Osveži</button>
          <button type="button" onClick={() => void logout()}>Odjava</button>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <small>OVERVIEW · POSLEDNJIH {overview.windowDays} DANA</small>
          <h1>Šta se dešava sa TachoCommand-om.</h1>
          <p>Jedan read-only pregled landinga, aplikacije i tehničkog zdravlja. Broj sesija nije broj osoba.</p>
        </div>
        <div className={styles.health}>
          <i />
          <div><span>DATA PIPELINE</span><strong>READY</strong><small>Generisano {formatTime(overview.generatedAt)}</small></div>
        </div>
      </section>

      <section className={styles.metricGrid}>
        {cards.map(([label, value, hint]) => (
          <article key={label} className={styles.metricCard}>
            <span>{label}</span>
            <strong>{formatNumber(value)}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>

      <section className={styles.panelGrid}>
        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><small>TRAFFIC</small><h2>14 dana</h2></div><span>Landing / App</span></div>
          <div className={styles.dailyChart}>
            {overview.product.daily.length === 0 ? <p>Nema analytics podataka.</p> : overview.product.daily.map((row) => (
              <div className={styles.dayColumn} key={row.day} title={`${row.day}: landing ${row.landingViews}, app ${row.appOpens}`}>
                <div className={styles.bars}>
                  <i style={{ height: `${Math.max(3, (row.landingViews / maxDaily) * 100)}%` }} />
                  <b style={{ height: `${Math.max(3, (row.appOpens / maxDaily) * 100)}%` }} />
                </div>
                <span>{row.day.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className={styles.legend}><span><i />Landing</span><span><i className={styles.appLegend} />App</span></div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><small>FUNNEL</small><h2>Akcije</h2></div></div>
          <div className={styles.rows}>
            <div><span>Open app klik</span><strong>{formatNumber(overview.product.openAppClicks)}</strong></div>
            <div><span>Vodič otvoren</span><strong>{formatNumber(overview.product.guideClicks)}</strong></div>
            <div><span>Demo start</span><strong>{formatNumber(overview.product.trialStarts)}</strong></div>
            <div><span>Demo success</span><strong>{formatNumber(overview.product.trialSuccesses)}</strong></div>
            <div><span>Demo error</span><strong>{formatNumber(overview.product.trialErrors)}</strong></div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><small>ACQUISITION</small><h2>Izvori</h2></div></div>
          <div className={styles.rows}>
            {Object.entries(overview.product.sources).length === 0 ? <p>Nema podataka.</p> : Object.entries(overview.product.sources).map(([source, count]) => (
              <div key={source}><span>{source}</span><strong>{formatNumber(count)}</strong></div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><small>LANGUAGE</small><h2>Jezici</h2></div></div>
          <div className={styles.rows}>
            {Object.entries(overview.product.locales).length === 0 ? <p>Nema podataka.</p> : Object.entries(overview.product.locales).map(([locale, count]) => (
              <div key={locale}><span>{locale.toUpperCase()}</span><strong>{formatNumber(count)}</strong></div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><small>TECHNICAL TELEMETRY</small><h2>Zdravlje očitavanja</h2></div><span>{formatNumber(overview.technical.totalEvents)} događaja</span></div>
          <div className={styles.rows}>
            {Object.entries(overview.technical.outcomes).length === 0 ? <p>Nema podataka.</p> : Object.entries(overview.technical.outcomes).map(([outcome, count]) => (
              <div key={outcome}><span>{outcome}</span><strong>{formatNumber(count)}</strong></div>
            ))}
          </div>
          <p className={styles.meta}>Poslednji tehnički događaj: {formatTime(overview.technical.lastEventAt)}</p>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><div><small>PRIVACY BOUNDARY</small><h2>Šta ovde ne postoji</h2></div></div>
          <ul className={styles.privacyList}>
            <li>nema identiteta vozača</li>
            <li>nema brojeva kartica ili registracija</li>
            <li>nema GPS lokacije</li>
            <li>nema raw tahografskih podataka</li>
            <li>nema IP / user-agent evidencije u product analytics tabeli</li>
          </ul>
          <p className={styles.meta}>Product analytics {overview.privacy.productRetentionDays} dana · technical telemetry {overview.privacy.technicalRetentionDays} dana.</p>
        </article>
      </section>
    </main>
  );
}
