"use client";
import type { CardTransportDiagnostic } from "../../lib/card-transport-diagnostic";
import Link from "next/link";
import { diagnosticCopy } from "../../lib/product-diagnostic-copy.js";
import { appCopy as copy, APP_LANGUAGES, type AppLocale } from "../../lib/product-app-copy.js";
import { reviewUtcCardBreaks, exportUtcCardCsv } from "../../lib/card-utc-review.js";
import { useState } from "react";
import styles from "./field-proven-premium-ui.module.css";
import type {
  FieldProvenProductState,
  FieldProvenHistoryDay,
} from "../../lib/field-proven-product-state.js";
export type ProductTab = "live" | "periods" | "history" | "attention" | "card";
type Locale = AppLocale;
type ProductControls = {
  canonicalCard?: Readonly<Record<string, unknown>> | null;
  persisted?: boolean;
  phase:
    | "idle"
    | "connecting"
    | "connected"
    | "card-preparing"
    | "card-reading"
    | "error";
  restoreState: "checking" | "restored" | "empty" | "invalid";
  restoredLabel: string | null;
  errorText: string | null;
  cardReadProgress: {
    submessages: number;
    byteLength: number;
    complete: boolean;
  } | null;
  cardDiagnostic?: CardTransportDiagnostic | null;
  diagnosticsEnabled?: boolean;
  accessAllowed?: boolean;
  cardAttemptCode: string | null;
  versionLine: string;
  locale: Locale;
  onLocale: (locale: Locale) => void;
  zone: string;
  periodLabel: string;
  periodComplete: boolean;
  savedAvailable: boolean;
  screenAwake: boolean;
  accepted: boolean;
  onShowSaved: () => void;
  onForget: () => void;
  onCancel: () => void;
  onDisconnect?: () => void;
  onConnect: () => void;
  onReadCard: () => void;
};
function minutes(value: number | null) {
  return value === null
    ? "—"
    : `${Math.floor(value / 60)} h ${String(value % 60).padStart(2, "0")} min`;
}
function clock(value: number | null) {
  return value === null
    ? "—"
    : `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
function exportCsv(controls: ProductControls) {
  const url = URL.createObjectURL(
    new Blob(
      [exportUtcCardCsv(controls.canonicalCard ?? null, controls.zone, controls.persisted !== false)],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "TachoCommand-overview.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function FieldProvenPremiumUi({
  state,
  controls: c,
}: {
  state: FieldProvenProductState;
  controls: ProductControls;
}) {
  const [tab, setTab] = useState<ProductTab>("live");
  const [selected, setSelected] = useState<string | null>(null);
  const t = copy[c.locale];
  const d = diagnosticCopy[c.locale];
  const unsavedTitle = {sr:'Kartica proverena · nije sačuvana',en:'Card verified · not saved',de:'Karte geprüft · nicht gespeichert',ru:'Карта проверена · не сохранена',bg:'Картата е проверена · не е запазена',ro:'Card verificat · nesalvat',hu:'Kártya ellenőrizve · nincs mentve'}[c.locale];
  const cutoffLabel = {sr:'Podaci do početka očitavanja',en:'Data cutoff: read start',de:'Datenstand: Beginn der Auslesung',ru:'Данные на момент начала считывания',bg:'Данни към началото на прочитането',ro:'Date până la începutul citirii',hu:'Adatok a kiolvasás kezdetéig'}[c.locale];
  const unsavedCopy = {
    sr: "Očitavanje je provereno, ali nije sačuvano na telefonu. Izvezite CSV pre zatvaranja aplikacije. Prethodno sačuvana kartica nije zamenjena.",
    en: "The read is verified but not saved on this phone. Export CSV before closing the app. The previously saved card has not been replaced.",
    de: "Die Auslesung ist geprüft, aber nicht auf diesem Telefon gespeichert. Vor dem Schließen CSV exportieren. Die zuvor gespeicherte Karte wurde nicht ersetzt.",
    ru: "Считывание проверено, но не сохранено на телефоне. Экспортируйте CSV до закрытия приложения. Ранее сохранённая карта не заменена.",
    bg: "Прочитането е проверено, но не е запазено на телефона. Експортирайте CSV преди затваряне. Предишната запазена карта не е заменена.",
    ro: "Citirea este verificată, dar nu este salvată pe telefon. Exportați CSV înainte de închidere. Cardul salvat anterior nu a fost înlocuit.",
    hu: "A kiolvasás ellenőrzött, de nincs elmentve a telefonra. Bezárás előtt exportálja CSV-be. A korábban mentett kártya nem változott.",
  }[c.locale];
  const analysis = reviewUtcCardBreaks(c.canonicalCard ?? null, c.zone);
  const warningCopy = {
    sr: {title: "Provera pauza", scope: "Standardno pravilo: 4 h 30 min vožnje; pauza 45 min ili najmanje 15 + 30 min, tim redom. Nalazi važe za taj režim. Posebni režimi prevoza, radno vreme i dnevni/nedeljni odmori nisu provereni.", none: "Nema pronađenog prekoračenja po ovoj proveri. To nije potvrda da nema drugih prekršaja.", gap: "Nepotpuni ili vremenski nejasni podaci: deo istorije nije moguće proveriti.", excess: "Prekoračenje", count: "Periodi za proveru"},
    en: {title: "Driving break check", scope: "Standard rule: 4 h 30 min driving; 45 min break or at least 15 + 30 min, in that order. Findings apply to this regime. Special transport regimes, working time and daily/weekly rest are not checked.", none: "No exceedance found by this check. This does not confirm the absence of other infringements.", gap: "Incomplete or ambiguous times: part of the history could not be checked.", excess: "Excess", count: "Periods to review"},
    de: {title: "Lenkpausenprüfung", scope: "Standardregel: 4 Std. 30 Min. Lenkzeit; 45 Min. Pause oder mindestens 15 + 30 Min., in dieser Reihenfolge. Die Ergebnisse gelten für diese Regel. Sonderregelungen, Arbeitszeit sowie tägliche/wöchentliche Ruhezeiten werden nicht geprüft.", none: "Keine Überschreitung bei dieser Prüfung gefunden. Andere Verstöße sind damit nicht ausgeschlossen.", gap: "Unvollständige oder unklare Zeitangaben: Ein Teil des Verlaufs konnte nicht geprüft werden.", excess: "Überschreitung", count: "Zu prüfende Zeiträume"},
    ru: {"title": "Проверка перерывов", "scope": "Стандартное правило: 4 ч 30 мин вождения; перерыв 45 мин или минимум 15 + 30 мин в этом порядке. Выводы относятся к этому режиму. Особые режимы перевозок, рабочее время, ежедневный и еженедельный отдых не проверяются.", "none": "Эта проверка не выявила превышений. Это не исключает других нарушений.", "gap": "Неполные или неоднозначные данные: часть истории не удалось проверить.", "excess": "Превышение", "count": "Периоды для проверки"},
    bg: {"title": "Проверка на прекъсванията", "scope": "Стандартно правило: 4 ч 30 мин управление; прекъсване 45 мин или поне 15 + 30 мин в този ред. Резултатите важат за този режим. Специалните режими, работното време и дневната/седмичната почивка не се проверяват.", "none": "Тази проверка не откри превишения. Това не изключва други нарушения.", "gap": "Непълни или неясни данни: част от историята не може да се провери.", "excess": "Превишение", "count": "Периоди за проверка"},
    ro: {"title": "Verificarea pauzelor", "scope": "Regula standard: 4 h 30 min de conducere; pauză de 45 min sau cel puțin 15 + 30 min, în această ordine. Rezultatele se aplică acestui regim. Regimurile speciale, timpul de lucru și repausul zilnic/săptămânal nu sunt verificate.", "none": "Această verificare nu a identificat depășiri. Aceasta nu exclude alte încălcări.", "gap": "Date incomplete sau ore ambigue: o parte din istoric nu a putut fi verificată.", "excess": "Depășire", "count": "Perioade de verificat"},
    hu: {"title": "Vezetési szünetek ellenőrzése", "scope": "Általános szabály: 4 óra 30 perc vezetés; 45 perc szünet vagy legalább 15 + 30 perc, ebben a sorrendben. Az eredmények erre a szabályra vonatkoznak. A különleges szabályok, a munkaidő és a napi/heti pihenő nincs ellenőrizve.", "none": "Az ellenőrzés nem talált túllépést. Ez nem zárja ki más szabálysértések lehetőségét.", "gap": "Hiányos vagy bizonytalan időadatok: az előzmények egy része nem ellenőrizhető.", "excess": "Túllépés", "count": "Ellenőrizendő időszakok"},
  }[c.locale];
  const busy =
    c.phase === "card-reading" ||
    c.phase === "card-preparing" ||
    c.phase === "connecting";
  const activity = {
    DRIVING: t.drive,
    WORK: t.work,
    AVAILABILITY: t.availability,
    REST: t.rest,
    UNKNOWN: t.unknown,
  };
  const kinds = {
    drive: t.drive,
    work: t.work,
    availability: t.availability,
    rest: t.rest,
  };
  const day: FieldProvenHistoryDay | undefined = state.historyDays.find(
    (d) => d.dateIso === selected,
  );
  const status =
    c.phase === "card-preparing"
      ? t.prepare
      : c.phase === "card-reading"
        ? c.cardReadProgress?.complete
          ? t.processing
          : t.reading
        : c.accepted
          ? (c.persisted === false ? unsavedTitle : t.success)
          : c.phase === "connecting"
            ? t.connecting
            : state.live
              ? t.live
              : state.liveSnapshotAvailable
                ? t.saved
                : t.offline;
  const metrics = [
    [t.continuous, state.continuousDrivingMinutes],
    [t.today, state.todayDrivingMinutes],
    [t.week, state.weekDrivingMinutes],
    [t.breaks, state.cumulativeBreakMinutes],
  ] as const;
  return (
    <div className={styles.shell} lang={c.locale}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandMark} aria-label="TachoCommand">
            TC
          </Link>
          <strong>TachoCommand</strong>
        </div>
        <label>
          {t.language}
          <select
            value={c.locale}
            onChange={(e) => c.onLocale(e.target.value as Locale)}
          >
            {Object.entries(APP_LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </header>
      <main className={styles.content}>
        {c.persisted === false && <p role="alert">{unsavedCopy}</p>}
        <div className={styles.screenTopline} role="status" aria-live="polite">
          <strong>{status}</strong>
        </div>
        <p className={styles.safetyNote}>{t.safety}</p>
        {c.errorText && (
          <p role="alert">{c.locale === "sr" ? c.errorText : t.error}</p>
        )}
        {c.savedAvailable && (
          <section className={styles.emptyPanel}>
            <p>{c.persisted === false ? unsavedCopy : t.savedNote}</p>
            <button disabled={busy} onClick={c.onShowSaved}>
              {t.showSaved}
            </button>
          </section>
        )}
        {tab !== "attention" && analysis.findings.length > 0 && <button className={styles.breakNotice} onClick={() => setTab("attention")}>{warningCopy.count}: {analysis.findings.length}</button>}
        {tab === "live" && (
          <div className={styles.screen}>
            <section className={styles.primaryControl}>
              <p>{c.phase === "connected" ? t.connected : t.offline}</p>
              <button
                onClick={c.onConnect}
                disabled={c.accessAllowed === false || busy || c.phase === "connected"}
              >
                {c.phase === "connecting" ? t.connecting : t.connect}
              </button>
              {c.phase === "connected" && (
                <button onClick={c.onDisconnect}>{t.disconnect}</button>
              )}
            </section>
            <section className={styles.activityCard}>
              <span>{t.activity}</span>
              <strong style={{color: state.currentActivity === "UNKNOWN" ? "var(--tc-muted)" : undefined}}>{activity[state.currentActivity]}</strong>
              <small>
                {t.last}: {state.lastLiveReadLabel ?? "—"}
              </small>
            </section>
            <div className={styles.metricsGrid}>{metrics.map(([label, value]) => (
              <section className={styles.metricPanel} key={label}>
                <div className={styles.metricRow}>
                  <span>{label}</span>
                  <strong>{minutes(value)}</strong>
                </div>
              </section>
            ))}</div>
            <p className={styles.subtleNote}>{t.breakNote}</p>
            <section className={styles.cardActionPanel}>
              <div>
                <strong>{c.accepted ? (c.persisted === false ? unsavedTitle : t.success) : t.read}</strong>
                {c.cardReadProgress && (
                  <p role="status" aria-live="polite">
                    {t.packets}: {c.cardReadProgress.submessages} ·{" "}
                    {(c.cardReadProgress.byteLength / 1000).toFixed(1)} KB
                  </p>
                )}
                {c.phase === "card-reading" && (
                  <>
                    <progress aria-label={t.reading} />
                    <p>{c.screenAwake ? t.awake : t.noWake}</p>
                  </>
                )}
                {!c.diagnosticsEnabled && c.phase === "card-reading" && (c.cardDiagnostic?.packetIdleMs ?? 0) >= 10000 && <p role="status">{d.stalled}</p>}
                {c.diagnosticsEnabled && c.cardDiagnostic && (
                  <div>
                    {c.cardDiagnostic.errorCode && <p role="alert">{d.stop}: <code>{c.cardDiagnostic.errorCode}</code></p>}
                    {!c.cardDiagnostic.errorCode && (c.cardDiagnostic.packetIdleMs ?? 0) >= 10000 && <p role="status">{d.stalled}</p>}
                    <details className={styles.diagnosticDetails}><summary>{d.details}</summary>
                    <p>{d.stage}: <code>{c.cardDiagnostic.stage}</code></p>
                    <p>{d.lastStage}: <code>{c.cardDiagnostic.lastConfirmedStage}</code></p>
                    {c.cardDiagnostic.errorCode && <p role="alert">{d.stop}: <code>{c.cardDiagnostic.errorCode}</code></p>}
                    <p>{d.elapsed}: {(c.cardDiagnostic.elapsedMs / 1000).toFixed(1)} s · {d.pending}: {c.cardDiagnostic.pendingResponses}</p>
                    {c.cardDiagnostic.packetIdleMs != null && <p>{d.idle}: {(c.cardDiagnostic.packetIdleMs / 1000).toFixed(0)} s / {(c.cardDiagnostic.cardIdleTimeoutMs ?? 60000) / 1000} s</p>}
                    {!c.cardDiagnostic.errorCode && (c.cardDiagnostic.packetIdleMs ?? 0) >= 10000 && <p role="status">{d.stalled}</p>}
                    {c.cardDiagnostic.events && <div>
                      <p>GATT: {String(c.cardDiagnostic.connected)} · {d.credits}: {c.cardDiagnostic.serverCredits} · {d.queue}: {c.cardDiagnostic.queuedWrites}</p>
                      {c.cardDiagnostic.failureState && <p>GATT ({d.error}): {String(c.cardDiagnostic.failureState.connected)} · {d.write} ({d.error}): {c.cardDiagnostic.failureState.activeWrite ?? "—"}</p>}
                      <p>{d.write}: {c.cardDiagnostic.activeWrite ?? "—"} · ACK: {c.cardDiagnostic.ackRequested ?? "—"} / {c.cardDiagnostic.ackWritten ?? "—"}</p>
                      <p>{d.notifications}: {c.cardDiagnostic.notificationCount} · {d.partial}: {c.cardDiagnostic.partialMessages} · {d.ignored}: {c.cardDiagnostic.ignoredMessages}</p>
                      {c.cardDiagnostic.handoff && <p>{d.close}: {c.cardDiagnostic.handoff.closeMs} ms · {d.settle}: {c.cardDiagnostic.handoff.settleMs} ms</p>}
                      <p>{d.ack}</p>
                      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "0.75rem" }}>{c.cardDiagnostic.events.slice(-20).map(event => `${(event.ms / 1000).toFixed(1)}s ${event.event} ${Object.entries(event).filter(([key]) => key !== "ms" && key !== "event").map(([key, value]) => `${key}=${value}`).join(" ")}`).join("\n")}</pre>
                      <button onClick={() => {
                        const blob = new Blob([JSON.stringify({ schema: 1, version: c.versionLine, attemptCode: c.cardAttemptCode, diagnostic: c.cardDiagnostic }, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url; link.download = `tachocommand-diagnostic-${c.cardAttemptCode ?? "handoff"}.json`;
                        document.body.appendChild(link); link.click(); link.remove();
                        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }}>{d.download}</button>
                    </div>}
                    {c.cardDiagnostic.stage === "waiting_first_packet" && !c.cardDiagnostic.errorCode && <p>{d.first} {c.cardDiagnostic.firstPacketTimeoutMs / 1000} s</p>}
                    </details>
                  </div>
                )}
                {c.diagnosticsEnabled && c.cardAttemptCode && (
                  <p>
                    {t.support}: {c.cardAttemptCode}
                  </p>
                )}
              </div>
              {["connecting", "card-preparing", "card-reading"].includes(c.phase) ? (
                <button onClick={c.onCancel}>{t.cancel}</button>
              ) : (
                <button
                  disabled={c.accessAllowed === false || busy || c.phase !== "connected"}
                  onClick={c.onReadCard}
                >
                  {t.read}
                </button>
              )}
            </section>
            <a href={"/" + c.locale + "#connect"}>{t.help}</a>
          </div>
        )}
        {tab === "periods" && (
          <div className={styles.screen}>
            {[
              [t.today, state.todayDrivingMinutes],
              [t.week, state.weekDrivingMinutes],
              [t.fortnight, state.fortnightDrivingMinutes],
            ].map(([label, value]) => (
              <section className={styles.periodCard} key={String(label)}>
                <span>{label}</span>
                <strong>{minutes(value as number | null)}</strong>
              </section>
            ))}
            <p>
              {c.periodLabel} · {c.zone}
            </p>
            {!c.periodComplete && <p>{t.partial}</p>}
            <p>
              {cutoffLabel}: {c.restoredLabel ?? "—"}
            </p>
          </div>
        )}
        {tab === "history" && (
          <div className={styles.screen}>
            <h1>{t.history}</h1>
            <p>
              {state.historyDaysAvailable}/56 {t.days} · {c.zone}
            </p>
            <p>
              {cutoffLabel}: {c.restoredLabel ?? "—"}
            </p>
            {day ? (
              <>
                <button onClick={() => setSelected(null)}>← {t.back}</button>
                <h2>{day.dateIso}</h2>
                <p>{t.dayNote}</p>
                {day.timingComplete && (
                  <section className={styles.dayTimelinePanel}>
                    <div className={styles.dayTimelineHeader}>
                      <span>00:00</span>
                      <span>12:00</span>
                      <span>24:00</span>
                    </div>
                    <div
                      className={styles.dayTimelineTrack}
                      aria-label={t.history}
                    >
                      {day.segments.map((seg, i) =>
                        seg.startMinute !== null && seg.endMinute !== null ? (
                          <span
                            key={i}
                            className={styles[seg.kind]}
                            style={{
                              left: (seg.startMinute / 1440) * 100 + "%",
                              width:
                                ((seg.endMinute - seg.startMinute) / 1440) *
                                  100 +
                                "%",
                            }}
                            title={
                              kinds[seg.kind] +
                              " " +
                              clock(seg.startMinute) +
                              "–" +
                              clock(seg.endMinute)
                            }
                          />
                        ) : null,
                      )}
                    </div>
                  </section>
                )}
                <div className={styles.daySummaryGrid}>
                  {Object.entries(day.activityTotals).map(([kind, value]) => (
                    <section key={kind}>
                      <span>{kinds[kind as keyof typeof kinds]}</span>
                      <strong>{minutes(value)}</strong>
                    </section>
                  ))}
                </div>
                {day.events.length > 0 && (
                  <ul>
                    {day.events.map((event, i) => (
                      <li key={i}>
                        <time>{clock(event.minute)}</time> ·{" "}
                        {event.kind === "card-inserted"
                          ? t.inserted
                          : t.removed}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.daySequencePanel}>
                  {day.segments.map((seg, i) => (
                    <div className={styles.daySequenceRow} key={i}>
                      <time>
                        {clock(seg.startMinute)}–{clock(seg.endMinute)}
                      </time>
                      <span>{kinds[seg.kind]}</span>
                      <strong>{minutes(seg.minutes)}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : state.historyDays.length ? (
              state.historyDays.map((d) => (
                <button
                  className={styles.historyRow}
                  key={d.dateIso ?? d.dateLabel}
                  onClick={() => setSelected(d.dateIso)}
                >
                  <strong>{d.dateLabel}</strong>
                  <span>{t.drive}</span>
                  <strong>{minutes(d.drivingMinutes)}</strong>
                  <span>›</span>
                </button>
              ))
            ) : (
              <p>{t.empty}</p>
            )}
          </div>
        )}
        {tab === "attention" && (
          <section className={styles.emptyPanel}>
            <h1>{warningCopy.title}</h1>
            <p>{warningCopy.scope}</p>
            {!state.historyDays.length ? <p>{t.empty}</p> : <>
              {analysis.incomplete && <p>{warningCopy.gap}</p>}
              {!analysis.findings.length && <p>{warningCopy.none}</p>}
              {analysis.findings.map((f, i) => <section className={styles.breakFinding} key={i}>
                <h2>{f.startLabel} – {f.endLabel}</h2>
                <p>{t.drive}: <strong>{minutes(f.drivingMinutes)}</strong></p>
                <p>{warningCopy.excess}: <strong>{f.excessMinutes} min</strong></p>
              </section>)}
            </>}
          </section>
        )}
        {tab === "card" && (
          <div className={styles.screen}>
            <h1>{t.card}</h1>
            <p>{c.persisted === false ? unsavedCopy : t.savedNote}</p>
            <div className={styles.statusGrid}>
              <section>
                {t.driver}
                <strong>{state.driverName ?? "—"}</strong>
              </section>
              <section>
                {t.card}
                <strong>
                  {state.cardLast4 ? "•••• " + state.cardLast4 : "—"}
                </strong>
              </section>
              <section>
                {t.device}
                <strong>{state.tachographLabel ?? "—"}</strong>
              </section>
              <section>
                {cutoffLabel}
                <strong>{c.restoredLabel ?? "—"}</strong>
              </section>
            </div>
            <p>
              {t.zone}: {c.zone}
            </p>
            <button
              disabled={busy || !state.cardReadComplete}
              onClick={() => exportCsv(c)}
            >
              {t.csv}
            </button>
            <p>{t.exportNote}</p>
            <button
              disabled={busy || (!state.cardReadComplete && !c.savedAvailable)}
              onClick={() => {
                if (window.confirm(t.confirm)) c.onForget();
              }}
            >
              {t.remove}
            </button>
            <p className={styles.versionLine}>{c.versionLine}</p>
          </div>
        )}
      </main>
      <nav className={styles.bottomNav} aria-label={t.tabs[0]}>
        {(
          ["live", "periods", "history", "attention", "card"] as ProductTab[]
        ).map((id, i) => (
          <button
            key={id}
            className={tab === id ? styles.activeTab : ""}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              setSelected(null);
            }}
          >
            <span className={styles.navIcon} aria-hidden="true">{["◴", "▥", "≡", "!", "▤"][i]}</span><small>{t.tabs[i]}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
