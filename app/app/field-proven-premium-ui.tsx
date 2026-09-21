"use client";

import { useMemo, useState } from "react";
import styles from "./field-proven-premium-ui.module.css";
import type { FieldProvenActivity, FieldProvenHistoryDay, FieldProvenHistorySegment, FieldProvenProductState, FieldProvenTimelineKind } from "../../lib/field-proven-product-state.js";

export type ProductTab = "live" | "periods" | "history" | "attention" | "card";

type ProductControls = Readonly<{
  phase: "idle" | "connecting" | "connected" | "card-reading" | "error";
  restoreState: "checking" | "restored" | "empty" | "invalid";
  restoredLabel: string | null;
  errorText: string | null;
  cardReadProgress: Readonly<{
    submessages: number;
    byteLength: number;
    complete: boolean;
  }> | null;
  versionLine: string;
  onConnect: () => void;
  onReadCard: () => void;
}>;

const nav: readonly Readonly<{ id: ProductTab; label: string; glyph: string }>[] = Object.freeze([
  Object.freeze({ id: "live", label: "LIVE", glyph: "●" }),
  Object.freeze({ id: "periods", label: "Periodi", glyph: "▤" }),
  Object.freeze({ id: "history", label: "56 dana", glyph: "▥" }),
  Object.freeze({ id: "attention", label: "Pažnja", glyph: "!" }),
  Object.freeze({ id: "card", label: "Kartica", glyph: "◇" }),
]);

const ACTIVITY_SR: Readonly<Record<FieldProvenActivity, string>> = Object.freeze({
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

const TIMELINE_SR: Readonly<Record<FieldProvenTimelineKind, string>> = Object.freeze({
  drive: "VOŽNJA",
  work: "RAD",
  availability: "RASPOLOŽIVOST",
  rest: "ODMOR / PAUZA",
});

const HISTORY_EVENT_SR = Object.freeze({
  "card-inserted": "Kartica ubačena",
  "card-removed": "Kartica izvađena",
});

function formatClockMinute(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const safe = Math.min(1440, Math.max(0, Math.round(value)));
  if (safe === 1440) return "24:00";
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}

function segmentContext(day: FieldProvenHistoryDay, segment: FieldProvenHistorySegment): string | null {
  if (segment.label) return segment.label;
  const insertedHere = segment.startMinute !== null && day.events.some(
    (event) => event.kind === "card-inserted" && event.minute === segment.startMinute,
  );
  if (insertedHere && segment.kind === "work" && segment.minutes >= 7 && segment.minutes <= 15) {
    return "Provera vozila";
  }
  return null;
}

function IdentityHeader({ state, controls }: Readonly<{ state: FieldProvenProductState; controls: ProductControls }>) {
  const headerStatus = controls.phase === "card-reading"
    ? "OČITAVANJE"
    : controls.phase === "connecting"
      ? "POVEZIVANJE"
      : state.live
        ? "LIVE"
        : controls.cardReadProgress?.complete || state.liveSnapshotAvailable
          ? "SAČUVANO"
          : "OFFLINE";
  const activeStatus = headerStatus !== "OFFLINE";

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>TC</div>
          <div className={styles.brandText}>
            <strong>TachoCommand</strong>
            <span>INSTRUMENT ZA VOZAČE</span>
          </div>
        </div>
        <div className={activeStatus ? styles.livePill : styles.offlinePill}>
          <span aria-hidden="true" />
          {headerStatus}
        </div>
      </header>

      <section className={styles.identityStrip}>
        <div>
          <span className={styles.identityLabel}>KARTICA</span>
          <strong>{state.cardReadComplete ? "Kartica očitana" : state.slotLabel ?? "Čeka očitavanje"}</strong>
          <small>{state.cardReadComplete ? "Očitana i sačuvana lokalno" : "Kartica još nije očitana"}</small>
        </div>
        <div>
          <span className={styles.identityLabel}>TAHOGRAF</span>
          <strong>{state.tachographLabel ?? "Nije povezan"}</strong>
          <small>{state.tachographLabel ? "Poslednji povezani uređaj" : "Čeka povezivanje"}</small>
        </div>
      </section>
    </>
  );
}

function LiveScreen({ state, controls }: Readonly<{ state: FieldProvenProductState; controls: ProductControls }>) {
  const progress = clampPercent(state.continuousProgressPercent);
  const progressBandClass = {
    neutral: styles.progressNeutral,
    safe: styles.progressSafe,
    warning: styles.progressWarning,
    limit: styles.progressLimit,
  }[state.continuousBand];
  const cardProgress = controls.cardReadProgress;
  const cardVisualProgress = cardProgress?.complete
    ? 100
    : Math.min(96, Math.max(0, (cardProgress?.submessages ?? 0) / 2.8));

  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}>
        <span>{state.live ? "LIVE · POTVRĐENO SA TAHOGRAFA" : state.liveSnapshotAvailable ? "POSLEDNJE SAČUVANO OČITAVANJE" : "TAHOGRAF NIJE POVEZAN"}</span>
        <small>{state.lastLiveReadLabel ? state.lastLiveReadLabel : "Još nema očitavanja"}</small>
      </div>

      <section className={styles.primaryControl} data-phase={controls.phase}>
        <div>
          <span>LIVE VEZA</span>
          <strong>
            {controls.phase === "connecting" && "Povezivanje i LIVE očitavanje…"}
            {controls.phase === "card-reading" && "Sačekajte završetak očitavanja kartice"}
            {controls.phase === "connected" && "LIVE podaci su sačuvani"}
            {controls.phase === "error" && "LIVE očitavanje nije završeno"}
            {controls.phase === "idle" && "Poveži tahograf za LIVE podatke"}
          </strong>
          {controls.errorText ? <small>{controls.errorText}</small> : null}
        </div>
        <button
          type="button"
          onClick={controls.onConnect}
          disabled={controls.phase === "connecting" || controls.phase === "card-reading"}
        >
          {controls.phase === "connecting" && "Povezujem…"}
          {controls.phase === "card-reading" && "Kartica se očitava…"}
          {controls.phase === "connected" && "Osveži LIVE"}
          {controls.phase === "error" && "Ponovi LIVE"}
          {controls.phase === "idle" && "Poveži tahograf"}
        </button>
      </section>

      <section className={styles.activityCard}>
        <span>TRENUTNA AKTIVNOST</span>
        <strong>{state.liveSnapshotAvailable ? ACTIVITY_SR[state.currentActivity] : "—"}</strong>
        <p>{state.live ? "LIVE podaci su potvrđeni sa tahografa." : state.liveSnapshotAvailable ? "Prikazano je poslednje potvrđeno očitavanje; aktivna veza je završena." : "Poveži tahograf da bi trenutna aktivnost bila potvrđena."}</p>
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
          <span>Danas</span>
          <strong>{formatMinutes(state.todayDrivingMinutes)}</strong>
        </div>
        <div className={styles.slimTrack}>
          <span style={{ width: String(clampPercent(state.todayDrivingMinutes === null ? null : state.todayDrivingMinutes / 6)) + "%" }} />
        </div>
      </section>

      <section className={styles.metricPanel}>
        <div className={styles.metricRow}>
          <span>Ove nedelje</span>
          <strong>{formatMinutes(state.weekDrivingMinutes)}</strong>
        </div>
        <div className={styles.slimTrack}>
          <span style={{ width: String(clampPercent(state.weekDrivingMinutes === null ? null : state.weekDrivingMinutes / 33.6)) + "%" }} />
        </div>
      </section>

      <section className={styles.cardActionPanel} data-reading={controls.phase === "card-reading" ? "true" : "false"}>
        <div>
          <span>KARTICA</span>
          <strong>
            {controls.phase === "card-reading"
              ? "Očitavanje kartice je u toku…"
              : cardProgress?.complete
                ? "Očitavanje kartice je završeno"
                : state.cardReadComplete
                  ? "Kartica je sačuvana lokalno"
                  : "Očitaj poslednjih 56 dana"}
          </strong>
          {cardProgress ? (
            <div className={styles.cardTransferProgress} aria-live="polite">
              <div>
                <span>Paketi: {cardProgress.submessages}</span>
                <span>Preuzeto: {(cardProgress.byteLength / 1000).toLocaleString("sr-RS", { maximumFractionDigits: 1 })} KB</span>
              </div>
              <div className={styles.cardTransferTrack} aria-label={cardProgress.complete ? "Očitavanje kartice je završeno" : "Količina primljenih podataka raste tokom očitavanja"}>
                <span style={{ width: String(cardVisualProgress) + "%" }} />
              </div>
            </div>
          ) : state.cardReadComplete ? <small>{state.historyDaysAvailable}/56 dana sačuvano</small> : null}
        </div>
        <button
          type="button"
          onClick={controls.onReadCard}
          disabled={controls.phase === "connecting" || controls.phase === "card-reading"}
        >
          {controls.phase === "card-reading" ? "Očitavam…" : "Očitaj karticu"}
        </button>
      </section>
    </div>
  );
}

function PeriodsScreen({ state }: Readonly<{ state: FieldProvenProductState }>) {
  const periods = [
    ["DANAS", formatMinutes(state.todayDrivingMinutes), "Dnevna vožnja"],
    ["OVA NEDELJA", formatMinutes(state.weekDrivingMinutes), "Tekuća nedelja"],
    ["DVE NEDELJE", formatMinutes(state.fortnightDrivingMinutes), "Iz istorije kartice"],
  ] as const;

  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}><span>PERIODI</span><small>Potvrđene vrednosti</small></div>
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

function HistoryDayDetail({
  day,
  onBack,
}: Readonly<{ day: FieldProvenHistoryDay; onBack: () => void }>) {
  const ticks = Array.from({ length: 97 }, (_, index) => index);
  const summary = [
    ["drive", "Vožnja"],
    ["work", "Rad"],
    ["availability", "Raspoloživost"],
    ["rest", "Odmor / pauza"],
  ] as const;

  return (
    <div className={styles.screen}>
      <div className={styles.dayDetailTopline}>
        <button type="button" className={styles.backButton} onClick={onBack}>← 56 dana</button>
        <small>DETALJ DANA</small>
      </div>

      <div className={styles.pageIntro}>
        <h1>{day.dateLabel}</h1>
        <p>24-časovni zapis aktivnosti sa tahografske kartice. Velike crte su sati, srednje 30 min, male 15 min.</p>
      </div>

      {!day.timingComplete ? (
        <section className={styles.emptyPanel}>
          Apsolutna vremena za ovaj dan nisu potvrđena. TachoCommand prikazuje trajanja aktivnosti, ali ne izmišlja poziciju na 24-časovnoj liniji.
        </section>
      ) : (
      <section className={styles.dayTimelinePanel}>
        <div className={styles.dayTimelineHeader}>
          <span>00:00</span><strong>24 h</strong><span>24:00</span>
        </div>
        <div className={styles.dayTimelineTrack} aria-label={"24-časovna linija za " + day.dateLabel}>
          {day.segments.map((segment, index) => {
            if (segment.startMinute === null || segment.endMinute === null) return null;
            const left = (segment.startMinute / 1440) * 100;
            const width = ((segment.endMinute - segment.startMinute) / 1440) * 100;
            return (
              <span
                key={day.dateLabel + "-detail-" + String(index)}
                className={styles[segment.kind]}
                style={{ left: String(left) + "%", width: String(Math.max(0, width)) + "%" }}
                title={TIMELINE_SR[segment.kind] + " · " + formatClockMinute(segment.startMinute) + "–" + formatClockMinute(segment.endMinute)}
              />
            );
          })}
          {day.events.map((event, index) => (
            <i
              key={event.kind + "-" + String(event.minute) + "-" + String(index)}
              className={event.kind === "card-inserted" ? styles.cardInsertedMarker : styles.cardRemovedMarker}
              style={{ left: String((event.minute / 1440) * 100) + "%" }}
              aria-label={HISTORY_EVENT_SR[event.kind] + " u " + formatClockMinute(event.minute)}
              title={HISTORY_EVENT_SR[event.kind] + " · " + formatClockMinute(event.minute)}
            />
          ))}
        </div>
        <div className={styles.dayRuler} aria-hidden="true">
          {ticks.map((tick) => (
            <i
              key={tick}
              className={tick % 4 === 0 ? styles.hourTick : tick % 2 === 0 ? styles.halfHourTick : styles.quarterHourTick}
              style={{ left: String((tick / 96) * 100) + "%" }}
            />
          ))}
        </div>
        <div className={styles.dayHourLabels} aria-hidden="true">
          <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
        </div>
      </section>
      )}

      <div className={styles.daySummaryGrid}>
        {summary.map(([kind, label]) => (
          <section key={kind} className={styles.daySummaryCard}>
            <div><i className={styles[kind]} /><span>{label}</span></div>
            <strong>{formatMinutes(day.activityTotals[kind])}</strong>
          </section>
        ))}
      </div>

      <section className={styles.dayEventsPanel}>
        <span>DOGAĐAJI KARTICE</span>
        {day.events.length > 0 ? day.events.map((event, index) => (
          <div key={event.kind + "-row-" + String(index)}>
            <time>{formatClockMinute(event.minute)}</time>
            <strong>{HISTORY_EVENT_SR[event.kind]}</strong>
          </div>
        )) : <p>Ovaj dnevni zapis nema potvrđen marker ubacivanja ili vađenja kartice. TachoCommand ga ne izmišlja.</p>}
      </section>

      <section className={styles.daySequencePanel}>
        <span>TOK DANA</span>
        {day.segments.length === 0 ? <p>Nema obrađenih aktivnosti za ovaj dan.</p> : day.segments.map((segment, index) => {
          const context = segmentContext(day, segment);
          return (
            <div className={styles.daySequenceRow} key={day.dateLabel + "-sequence-" + String(index)}>
              <time>{segment.startMinute === null || segment.endMinute === null ? "Vreme nije potvrđeno" : formatClockMinute(segment.startMinute) + "–" + formatClockMinute(segment.endMinute)}</time>
              <div>
                <strong>{TIMELINE_SR[segment.kind]}</strong>
                {context ? <small>{context}</small> : null}
              </div>
              <span>{formatMinutes(segment.minutes)}</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function HistoryScreen({ state }: Readonly<{ state: FieldProvenProductState }>) {
  const visibleDays = state.historyDays.slice(0, 56);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const selectedDay = selectedDayIndex === null ? null : visibleDays[selectedDayIndex] ?? null;

  if (selectedDay) return <HistoryDayDetail day={selectedDay} onBack={() => setSelectedDayIndex(null)} />;

  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}><span>ISTORIJA KARTICE</span><small>{state.historyDaysAvailable} od 56 dana</small></div>

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
          {visibleDays.map((day, index) => (
            <button
              type="button"
              className={styles.historyRow}
              key={day.dateLabel + "-" + String(index)}
              onClick={() => setSelectedDayIndex(index)}
              aria-label={"Otvori detalj za " + day.dateLabel}
            >
              <strong>{day.dateLabel}</strong>
              <div className={styles.historyTimelineWrap}>
                <div
                  className={day.timingComplete ? styles.timeline : styles.timelineUnverified}
                  aria-label={day.timingComplete ? "24-časovna linija za " + day.dateLabel : "24-časovna linija bez potvrđenih apsolutnih vremena za " + day.dateLabel}
                >
                  {day.timingComplete ? day.segments.map((segment, segmentIndex) => {
                    if (segment.startMinute === null || segment.endMinute === null) return null;
                    return (
                      <span
                        key={day.dateLabel + "-" + String(segmentIndex)}
                        className={styles[segment.kind]}
                        style={{
                          left: String((segment.startMinute / 1440) * 100) + "%",
                          width: String(((segment.endMinute - segment.startMinute) / 1440) * 100) + "%",
                        }}
                      />
                    );
                  }) : <small>vreme nije potvrđeno</small>}
                </div>
                <div className={styles.historyHourLabels} aria-hidden="true">
                  <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                </div>
              </div>
              <strong>{formatMinutes(day.drivingMinutes)}</strong>
              <span className={styles.historyChevron} aria-hidden="true">›</span>
            </button>
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

function CardScreen({ state, controls }: Readonly<{ state: FieldProvenProductState; controls: ProductControls }>) {
  return (
    <div className={styles.screen}>
      <div className={styles.screenTopline}><span>KARTICA I VEZA</span><small>Podaci ostaju na telefonu</small></div>

      <div className={styles.statusGrid}>
        <section><span>KARTICA</span><strong>{state.cardLast4 ? `•••• ${state.cardLast4}` : "Nije očitana"}</strong></section>
        <section><span>VOZAČ</span><strong>{state.driverName ?? "Nije očitan"}</strong></section>
        <section><span>POSLEDNJE LIVE OČITAVANJE</span><strong>{state.lastLiveReadLabel ?? "—"}</strong></section>
        <section><span>TAHOGRAF</span><strong>{state.tachographLabel ?? "—"}</strong></section>
      </div>

      <section className={styles.cardReadPanel}>
        <span>ISTORIJA KARTICE</span>
        <strong>{state.cardReadComplete ? "Kartica je bezbedno očitana" : "Kartica još nije očitana"}</strong>
        <p>{state.historyDaysAvailable}/56 dana</p>
        {controls.restoreState === "restored" && controls.restoredLabel ? <small>Sačuvano {controls.restoredLabel}</small> : null}
      </section>
      <small className={styles.versionLine}>{controls.versionLine}</small>
    </div>
  );
}

export default function FieldProvenPremiumUi({ state, controls }: Readonly<{ state: FieldProvenProductState; controls: ProductControls }>) {
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
        return <CardScreen state={state} controls={controls} />;
      default:
        return <LiveScreen state={state} controls={controls} />;
    }
  }, [controls, state, tab]);

  return (
    <div className={styles.shell}>
      <IdentityHeader state={state} controls={controls} />
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
