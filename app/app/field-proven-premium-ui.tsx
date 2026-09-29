"use client";
import type { CardTransportDiagnostic } from "../../lib/card-transport-diagnostic";
import Link from "next/link";
import { useState } from "react";
import styles from "./field-proven-premium-ui.module.css";
import type {
  FieldProvenProductState,
  FieldProvenHistoryDay,
} from "../../lib/field-proven-product-state.js";
export type ProductTab = "live" | "periods" | "history" | "attention" | "card";
type Locale = "sr" | "en" | "de";
type ProductControls = {
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
const copy = {
  sr: {
    tabs: ["Pregled", "Periodi", "Istorija", "Pažnja", "Kartica"],
    language: "Jezik",
    live: "LIVE · potvrđeni podaci",
    saved: "Sačuvani podaci · nisu LIVE",
    offline: "Nema potvrđenih LIVE podataka",
    safety:
      "Povezivanje i očitavanje samo dok vozilo miruje. Tahograf ostaje merodavan.",
    disconnect: "Prekini vezu",
    connect: "Poveži tahograf",
    connecting: "Povezivanje…",
    connected: "Veza je uspostavljena",
    prepare: "Priprema očitavanja…",
    read: "Očitaj karticu",
    reading: "Preuzimanje kartice…",
    processing: "Podaci preneti · provera i čuvanje…",
    success: "Kartica obrađena i sačuvana",
    cancel: "Prekini očitavanje",
    error:
      "Očitavanje nije završeno. Proveri Bluetooth, karticu i dozvole, pa pokušaj ponovo.",
    activity: "Aktivnost",
    continuous: "Kontinuirana vožnja",
    today: "Danas",
    week: "Ove nedelje",
    fortnight: "Prethodna + tekuća nedelja",
    partial: "Period nije potpuno pokriven. Zbir nije potvrđen.",
    breaks: "Pauza prijavljena sa tahografa",
    breakNote:
      "Prikazana vrednost nije posebna potvrda pravila radnog vremena.",
    noAnalysis: "Analiza upozorenja nije dostupna",
    noAnalysisText:
      "Odsustvo nalaza nije potvrda da nema prekršaja. Proveri zvanični tahograf.",
    showSaved: "Prikaži prethodno sačuvanu karticu",
    savedNote:
      "Sačuvana istorija nije potvrđena kao kartica trenutno povezanog vozača.",
    history: "Istorija kartice",
    empty: "Nema prikazane istorije. Očitaj karticu ili izaberi sačuvanu.",
    days: "dana",
    back: "Nazad",
    until: "Sačuvano",
    zone: "Vremenska zona telefona",
    dayNote:
      "Lokalni prikaz. Prazni intervali nisu potvrđen odmor; na dan promene sata lokalna vremena mogu se ponoviti ili preskočiti.",
    drive: "Vožnja",
    work: "Rad",
    availability: "Raspoloživost",
    rest: "Odmor",
    unknown: "Nepoznato",
    inserted: "Kartica ubačena",
    removed: "Kartica izvađena",
    driver: "Vozač",
    card: "Kartica",
    device: "Uređaj",
    support: "Šifra pokušaja",
    packets: "Paketi",
    awake: "Ekran ostaje uključen",
    noWake: "Automatsko zaključavanje ekrana nije sprečeno",
    remove: "Obriši karticu sa ovog uređaja",
    confirm: "Obrisati sačuvanu karticu i istoriju sa ovog uređaja?",
    csv: "Izvezi pregled CSV",
    exportNote: "Korisnički pregled, nije zvanični potpisani DDD.",
    help: "Prvo povezivanje",
    last: "Poslednji LIVE uzorak",
  },
  en: {
    tabs: ["Overview", "Periods", "History", "Attention", "Card"],
    language: "Language",
    live: "LIVE · confirmed data",
    saved: "Saved data · not LIVE",
    offline: "No confirmed LIVE data",
    safety:
      "Connect and read only while stationary. The tachograph remains authoritative.",
    disconnect: "Disconnect",
    connect: "Connect tachograph",
    connecting: "Connecting…",
    connected: "Connection established",
    prepare: "Preparing card read…",
    read: "Read driver card",
    reading: "Downloading card…",
    processing: "Data received · validating and saving…",
    success: "Card processed and saved",
    cancel: "Cancel read",
    error:
      "Read did not complete. Check Bluetooth, card and permissions, then try again.",
    activity: "Activity",
    continuous: "Continuous driving",
    today: "Today",
    week: "This week",
    fortnight: "Previous + current week",
    partial: "Period coverage is incomplete. Total is unconfirmed.",
    breaks: "Break reported by tachograph",
    breakNote:
      "This value is not a separate confirmation of working-time rules.",
    noAnalysis: "Warning analysis unavailable",
    noAnalysisText:
      "No finding does not confirm the absence of infringements. Check the official tachograph.",
    showSaved: "Show previously saved card",
    savedNote:
      "Saved history is not verified as belonging to the currently connected driver.",
    history: "Card history",
    empty: "No history shown. Read a card or select saved data.",
    days: "days",
    back: "Back",
    until: "Saved",
    zone: "Phone time zone",
    dayNote:
      "Local display. Gaps are not confirmed rest; local times may repeat or skip on daylight-saving days.",
    drive: "Driving",
    work: "Work",
    availability: "Availability",
    rest: "Rest",
    unknown: "Unknown",
    inserted: "Card inserted",
    removed: "Card removed",
    driver: "Driver",
    card: "Card",
    device: "Device",
    support: "Attempt code",
    packets: "Packets",
    awake: "Screen wake lock active",
    noWake: "Automatic screen locking is not prevented",
    remove: "Delete card from this device",
    confirm: "Delete the saved card and history from this device?",
    csv: "Export CSV overview",
    exportNote: "User overview, not an official signed DDD file.",
    help: "First connection",
    last: "Last LIVE sample",
  },
  de: {
    tabs: ["Übersicht", "Zeiträume", "Verlauf", "Hinweise", "Karte"],
    language: "Sprache",
    live: "LIVE · bestätigte Daten",
    saved: "Gespeicherte Daten · nicht LIVE",
    offline: "Keine bestätigten LIVE-Daten",
    safety:
      "Nur bei stehendem Fahrzeug verbinden und auslesen. Der Tachograph bleibt maßgeblich.",
    disconnect: "Verbindung trennen",
    connect: "Tachograph verbinden",
    connecting: "Verbindung wird hergestellt…",
    connected: "Verbindung hergestellt",
    prepare: "Auslesen wird vorbereitet…",
    read: "Fahrerkarte auslesen",
    reading: "Karte wird heruntergeladen…",
    processing: "Daten empfangen · prüfen und speichern…",
    success: "Karte verarbeitet und gespeichert",
    cancel: "Auslesen abbrechen",
    error:
      "Auslesen nicht abgeschlossen. Bluetooth, Karte und Berechtigungen prüfen und erneut versuchen.",
    activity: "Tätigkeit",
    continuous: "Ununterbrochene Lenkzeit",
    today: "Heute",
    week: "Diese Woche",
    fortnight: "Vorherige + aktuelle Woche",
    partial: "Zeitraum nicht vollständig erfasst. Summe unbestätigt.",
    breaks: "Vom Tachograph gemeldete Pause",
    breakNote: "Dieser Wert bestätigt nicht gesondert die Arbeitszeitregeln.",
    noAnalysis: "Warnungsanalyse nicht verfügbar",
    noAnalysisText:
      "Kein Befund bestätigt nicht die Abwesenheit von Verstößen. Offiziellen Tachograph prüfen.",
    showSaved: "Zuvor gespeicherte Karte anzeigen",
    savedNote:
      "Der gespeicherte Verlauf ist nicht als Karte des aktuell verbundenen Fahrers bestätigt.",
    history: "Kartenverlauf",
    empty:
      "Kein Verlauf angezeigt. Karte auslesen oder gespeicherte Daten auswählen.",
    days: "Tage",
    back: "Zurück",
    until: "Gespeichert",
    zone: "Zeitzone des Telefons",
    dayNote:
      "Lokale Anzeige. Lücken sind keine bestätigte Ruhezeit; bei Zeitumstellung können Uhrzeiten wiederholt werden oder entfallen.",
    drive: "Lenken",
    work: "Arbeit",
    availability: "Bereitschaft",
    rest: "Ruhe",
    unknown: "Unbekannt",
    inserted: "Karte eingesteckt",
    removed: "Karte entnommen",
    driver: "Fahrer",
    card: "Karte",
    device: "Gerät",
    support: "Versuchscode",
    packets: "Pakete",
    awake: "Bildschirmsperre verhindert",
    noWake: "Automatische Bildschirmsperre wird nicht verhindert",
    remove: "Karte von diesem Gerät löschen",
    confirm: "Gespeicherte Karte und Verlauf von diesem Gerät löschen?",
    csv: "CSV-Übersicht exportieren",
    exportNote: "Benutzerübersicht, keine offiziell signierte DDD-Datei.",
    help: "Erste Verbindung",
    last: "Letzte LIVE-Abfrage",
  },
} as const;
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
function exportCsv(state: FieldProvenProductState, controls: ProductControls) {
  const quote = (value: unknown) =>
    '"' + String(value ?? "").replaceAll('"', '""') + '"';
  const rows: unknown[][] = [
    ["TachoCommand user overview — not official DDD"],
    ["Time zone", controls.zone],
    ["Saved", controls.restoredLabel],
    ["Date", "Activity", "Local start", "Local end", "Elapsed minutes"],
  ];
  for (const day of state.historyDays)
    for (const seg of day.segments)
      rows.push([
        day.dateIso,
        seg.kind,
        clock(seg.startMinute),
        clock(seg.endMinute),
        seg.minutes,
      ]);
  const url = URL.createObjectURL(
    new Blob(
      ["\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n")],
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
          ? t.success
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
            <option value="sr">SR</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
          </select>
        </label>
      </header>
      <main className={styles.content}>
        <div className={styles.screenTopline} role="status" aria-live="polite">
          <strong>{status}</strong>
        </div>
        <p>{t.safety}</p>
        {c.errorText && (
          <p role="alert">{c.locale === "sr" ? c.errorText : t.error}</p>
        )}
        {c.savedAvailable && (
          <section className={styles.emptyPanel}>
            <p>{t.savedNote}</p>
            <button disabled={busy} onClick={c.onShowSaved}>
              {t.showSaved}
            </button>
          </section>
        )}
        {tab === "live" && (
          <div className={styles.screen}>
            <section className={styles.primaryControl}>
              <p>{c.phase === "connected" ? t.connected : t.offline}</p>
              <button
                onClick={c.onConnect}
                disabled={busy || c.phase === "connected"}
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
            {metrics.map(([label, value]) => (
              <section className={styles.metricPanel} key={label}>
                <div className={styles.metricRow}>
                  <span>{label}</span>
                  <strong>{minutes(value)}</strong>
                </div>
              </section>
            ))}
            <p>{t.breakNote}</p>
            <section className={styles.cardActionPanel}>
              <div>
                <strong>{c.accepted ? t.success : t.read}</strong>
                {c.cardReadProgress && (
                  <p>
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
                {c.cardDiagnostic && (
                  <div aria-live="polite">
                    <p>{c.locale === "sr" ? "Faza" : c.locale === "de" ? "Phase" : "Stage"}: <code>{c.cardDiagnostic.stage}</code></p>
                    <p>{c.locale === "sr" ? "Poslednja potvrđena faza" : c.locale === "de" ? "Zuletzt bestätigt" : "Last confirmed stage"}: <code>{c.cardDiagnostic.lastConfirmedStage}</code></p>
                    {c.cardDiagnostic.errorCode && <p role="alert">{c.locale === "sr" ? "Razlog prekida" : c.locale === "de" ? "Abbruchgrund" : "Stop reason"}: <code>{c.cardDiagnostic.errorCode}</code></p>}
                    <p>{c.locale === "sr" ? "Vreme do poslednjeg događaja" : c.locale === "de" ? "Zeit bis zum letzten Ereignis" : "Time to last event"}: {(c.cardDiagnostic.elapsedMs / 1000).toFixed(1)} s · Pending: {c.cardDiagnostic.pendingResponses}</p>
                    {c.cardDiagnostic.stage === "waiting_first_packet" && !c.cardDiagnostic.errorCode && <p>{c.locale === "sr" ? "Čekanje prvog paketa, najviše" : c.locale === "de" ? "Warten auf erstes Paket, maximal" : "Waiting for first packet, maximum"} {c.cardDiagnostic.firstPacketTimeoutMs / 1000} s</p>}
                  </div>
                )}
                {c.cardAttemptCode && (
                  <p>
                    {t.support}: {c.cardAttemptCode}
                  </p>
                )}
              </div>
              {c.phase === "card-reading" ? (
                <button onClick={c.onCancel}>{t.cancel}</button>
              ) : (
                <button
                  disabled={busy || c.phase !== "connected"}
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
              {t.until}: {c.restoredLabel ?? "—"}
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
              {t.until}: {c.restoredLabel ?? "—"}
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
            <h1>{t.noAnalysis}</h1>
            <p>{t.noAnalysisText}</p>
          </section>
        )}
        {tab === "card" && (
          <div className={styles.screen}>
            <h1>{t.card}</h1>
            <p>{t.savedNote}</p>
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
                {t.until}
                <strong>{c.restoredLabel ?? "—"}</strong>
              </section>
            </div>
            <p>
              {t.zone}: {c.zone}
            </p>
            <button
              disabled={busy || !state.cardReadComplete}
              onClick={() => exportCsv(state, c)}
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
            {t.tabs[i]}
          </button>
        ))}
      </nav>
    </div>
  );
}
