"use client";

import { useMemo, useState } from "react";
import styles from "./field-proven-premium-ui.module.css";
import type { FieldProvenProductState } from "../../lib/field-proven-product-state.js";

export type ProductTab = "live" | "periods" | "history" | "attention" | "card";

const nav: readonly Readonly<{ id: ProductTab; label: string; glyph: string }>[] = Object.freeze([
  Object.freeze({ id: "live", label: "LIVE", glyph: "●" }),
  Object.freeze({ id: "periods", label: "Periodi", glyph: "▤" }),
  Object.freeze({ id: "history", label: "56 dana", glyph: "▥" }),
  Object.freeze({ id: "attention", label: "Pažnja", glyph: "!" }),
  Object.freeze({ id: "card", label: "Kartica", glyph: "◇" }),
]);

const ACTIVITY_SR: Readonly<Record<ActivityKind, string>> = Object.freeze({
  DRIVING: "VOŽNJA",
  WORK: "RAD",
  AVAILABILITY: "RASPOLOŽIVOST",
  REST: "ODMOR",
  UNKNOWN: "NEPOZNATO",
});

function formatMinutes(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  const rounded = Math.round(value);
  return Math.floor(rounded / 60) + " h " + String(rounded % 60).padStart(2, "0") + " min";
}

function clampPercent(value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function IdentityHeader({ state }: Readonly<{ state: FieldProvenProductState }>) {
  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>TC</div>
          <div className={styles.brandText}>
            <strong>TachoCommand</strong>
            <span>PROFESIONALNI INSTRUMENT VOZAČA</span>
          </div>
        </div>
        <div className={state.live ? styles.livePill : styles.offlinePill}>
          <span aria-hidden="true" />
          {state.live ? "LIVE" : "OFFLINE"}
        </div>
      </header>

      <section className={styles.identityStrip}>
        <div>
          <span className={styles.identityLabel}>VOZAČ</span>
          <strong>{state.driverName ?? "Identitet nije očitan"}</strong>
          <small>{state.cardLast4 ? "Kartica •••• " + state.cardLast4 : "Kartica nije očitana"}</small>
        </div>
        <div>
          <span className={styles.identityLabel}>TAHOGRAF</span>
          <strong>{state.tachographLabel ?? "Nije povezan"}</strong>
          <small>{state.tachographLabel ? "Poslednji odobreni uređaj" : "Čeka povezivanje"}</small>
        </div>
      </section>
    </>
  );
}

function LiveScreen({ state }: Readonly<{ state: FieldProvenProductState }>) {
  const progress = clampPercent(state.continuousProgressPercent);
  const progressBandClass = {
    neutral: styles.progressNeutral,
    safe: styles.progressSafe,
    warning: styles.progressWarning,
    limit: styles.progressLimit,
  }[state.continuousBand];

  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}>
        <span>LIVE • {state.live ? "POTVRĐENO SA TAHOGRAFA" : "NEMA AKTIVNE VEZE"}</span>
        <small>{state.lastLiveReadLabel ? "Poslednje očitavanje: " + state.lastLiveReadLabel : "Još nema očitavanja"}</small>
      </div>

      <section className={styles.activityCard}>
        <span>TRENUTNA AKTIVNOST</span>
        <strong>{state.live ? ACTIVITY_SR[state.currentActivity] : "—"}</strong>
        <p>{state.live ? "LIVE podaci su potvrđeni sa tahografa." : "Poveži tahograf da bi trenutna aktivnost bila potvrđena."}</p>
      </section>

      <section className={styles.metricPanel}>
        <div className={styles.metricRow}>
          <span>Neprekidna vožnja</span>
          <strong>{formatMinutes(state.continuousDrivingMinutes)}</strong>
        </div>
        <div className={styles.progressTrack} aria-label="Napredak neprekidne vožnje">
          <span
            className={styles.progressFill + " " + progressBandClass}
            style={{ width: String(progress) + "%" }}
          />
        </div>
        <div className={styles.progressScale}>
          <span>0:00</span>
          <span>{state.continuousRemainingLabel ? "Preostalo " + state.continuousRemainingLabel : "Bez potvrđenog praga"}</span>
          <span>{state.continuousThresholdLabel ?? "—"}</span>
        </div>
        <div className={styles.nextLine}>
          <strong>Sledeće:</strong>
          <span>{state.continuousRemainingLabel ? "do osnovnog praga preostaje " + state.continuousRemainingLabel + "." : "prag određuje aktivni profil; nema izmišljenog zaključka."}</span>
        </div>
      </section>

      <section className={styles.metricPanel}>
        <div className={styles.metricRow}>
          <span>Danas · F99A</span>
          <strong>{formatMinutes(state.todayDrivingMinutes)}</strong>
        </div>
        <div className={styles.slimTrack}>
          <span style={{ width: String(clampPercent(state.todayDrivingMinutes === null ? null : state.todayDrivingMinutes / 6)) + "%" }} />
        </div>
        <small>Dodirni za objašnjenje</small>
      </section>

      <section className={styles.metricPanel}>
        <div className={styles.metricRow}>
          <span>Ove nedelje · F99B</span>
          <strong>{formatMinutes(state.weekDrivingMinutes)}</strong>
        </div>
        <div className={styles.slimTrack}>
          <span style={{ width: String(clampPercent(state.weekDrivingMinutes === null ? null : state.weekDrivingMinutes / 33.6)) + "%" }} />
        </div>
        <small>Dodirni za objašnjenje</small>
      </section>
    </div>
  );
}

function PeriodsScreen({ state }: Readonly<{ state: FieldProvenProductState }>) {
  const periods = [
    ["DANAS", formatMinutes(state.todayDrivingMinutes), "DTCO F99A"],
    ["OVA NEDELJA", formatMinutes(state.weekDrivingMinutes), "DTCO F99B"],
    ["14 DANA", formatMinutes(state.fortnightDrivingMinutes), "Iz istorije kartice"],
  ] as const;

  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}><span>PERIODI</span><small>Samo potvrđene vrednosti</small></div>
      <div className={styles.pageIntro}>
        <h1>Vreme u kontekstu.</h1>
        <p>LIVE očitavanje daje trenutne zbirove. Potpuni periodi se popunjavaju iz bezbedno obrađene istorije kartice.</p>
      </div>
      <div className={styles.periodCards}>
        {periods.map(([label, value, source]) => (
          <section key={label} className={styles.periodCard}>
            <div><span>{label}</span><strong>{value}</strong></div>
            <small>{source}</small>
          </section>
        ))}
      </div>
    </div>
  );
}

function HistoryScreen({ state }: Readonly<{ state: FieldProvenProductState }>) {
  const visibleDays = state.historyDays.slice(0, 56);

  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}><span>ISTORIJA KARTICE</span><small>{state.historyDaysAvailable}/56 dana</small></div>
      <div className={styles.pageIntro}>
        <h1>Svaki dan, u jednoj liniji.</h1>
        <p>Stvarna istorija VOŽNJE, RADA, RASPOLOŽIVOSTI i ODMORA. Demo podaci se ne prikazuju.</p>
      </div>

      <div className={styles.legend}>
        <span><i className={styles.drive} />Vožnja</span>
        <span><i className={styles.work} />Rad</span>
        <span><i className={styles.availability} />Raspoloživost</span>
        <span><i className={styles.rest} />Odmor</span>
      </div>

      {visibleDays.length === 0 ? (
        <section className={styles.emptyPanel}>Kartica još nema obrađenu istoriju za prikaz.</section>
      ) : (
        <div className={styles.historyList}>
          {visibleDays.map((day) => (
            <section className={styles.historyRow} key={day.dateLabel}>
              <strong>{day.dateLabel}</strong>
              <div className={styles.timeline} aria-label={"Aktivnosti za " + day.dateLabel}>
                {day.segments.map((segment, index) => (
                  <span
                    key={day.dateLabel + "-" + String(index)}
                    className={styles[segment.kind]}
                    style={{ width: String(clampPercent(segment.percent)) + "%" }}
                  />
                ))}
              </div>
              <strong>{formatMinutes(day.drivingMinutes)}</strong>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionScreen({ state }: Readonly<{ state: FieldProvenProductState }>) {
  const hasAttention = Boolean(state.attentionTitle);

  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}><span>PAŽNJA</span><small>Nije pravni zaključak</small></div>
      <div className={styles.pageIntro}>
        <h1>Prvo ono što traži reakciju.</h1>
        <p>Preventivna upozorenja ostaju odvojena od mogućih prekršaja i pravne procene.</p>
      </div>

      <section className={hasAttention ? styles.attentionPanel : styles.okPanel}>
        <div className={hasAttention ? styles.attentionIcon : styles.okIcon}>{hasAttention ? "!" : "✓"}</div>
        <div>
          <strong>{state.attentionTitle ?? "Nema trenutnog upozorenja."}</strong>
          <p>{state.attentionBody ?? "Na osnovu dostupnih potvrđenih vrednosti. Tahograf ostaje merodavan."}</p>
        </div>
      </section>
    </div>
  );
}

function CardScreen({ state }: Readonly<{ state: FieldProvenProductState }>) {
  return (
    <div className={styles.screen}>
      <div className={styles.pageIntro}>
        <h1>Status bez izlaganja identiteta.</h1>
      </div>

      <div className={styles.statusGrid}>
        <section><span>SLOT</span><strong>{state.slotLabel ?? "Vozač 1 · Slot 1"}</strong></section>
        <section><span>IDENTITET</span><strong>{state.driverName ?? "Nije očitan"}</strong></section>
        <section><span>POSLEDNJE LIVE OČITAVANJE</span><strong>{state.lastLiveReadLabel ?? "—"}</strong></section>
        <section><span>TAHOGRAF</span><strong>{state.tachographLabel ?? "—"}</strong></section>
      </div>

      <section className={styles.cardReadPanel}>
        <span>ISTORIJA KARTICE</span>
        <strong>{state.cardReadComplete ? "Kartica je bezbedno očitana" : "Kartica još nije očitana"}</strong>
        <p>{state.historyDaysAvailable}/56 dana</p>
      </section>

      <section className={styles.languagePanel}>
        <strong>JEZIK APLIKACIJE</strong>
        <span>{state.localeLabel}</span>
      </section>

      <section className={styles.diagnosticsPanel}>
        <span>● &nbsp; TEHNIČKA DIJAGNOSTIKA</span>
        <strong>{state.telemetrySentCount === null ? "Nema potvrde o tehničkim događajima" : "Poslato " + String(state.telemetrySentCount) + " tehničkih događaja"}</strong>
        <p>Bez vrednosti sa kartice, imena, broja kartice, vozila, lokacije i punog Bluetooth naziva. Čuvanje najviše 60 dana.</p>
        {state.attemptCode ? <code>Šifra pokušaja: {state.attemptCode}</code> : null}
      </section>
    </div>
  );
}

export default function FieldProvenPremiumUi({ state }: Readonly<{ state: FieldProvenProductState }>) {
  const [tab, setTab] = useState<ProductTab>("live");

  const screen = useMemo(() => {
    switch (tab) {
      case "periods":
        return <PeriodsScreen state={state} />;
      case "history":
        return <HistoryScreen state={state} />;
      case "attention":
        return <AttentionScreen state={state} />;
      case "card":
        return <CardScreen state={state} />;
      default:
        return <LiveScreen state={state} />;
    }
  }, [state, tab]);

  return (
    <div className={styles.shell}>
      <IdentityHeader state={state} />
      <main className={styles.content}>{screen}</main>
      <nav className={styles.bottomNav} aria-label="Glavna navigacija">
        {nav.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              className={active ? styles.activeTab : ""}
              aria-current={active ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <span aria-hidden="true">{item.glyph}</span>
              <small>{item.label}</small>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
