"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Activity = "drive" | "work" | "available" | "rest";
type Tab = "cockpit" | "log" | "device" | "more";
type DeviceState = "idle" | "connecting" | "linked" | "unsupported" | "error";

type ActivityEvent = {
  id: string;
  activity: Activity;
  startedAt: string;
  source: "demo" | "manual";
};

type BleDevice = {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<{ connected: boolean }>;
    disconnect: () => void;
  };
  addEventListener: (type: "gattserverdisconnected", listener: () => void) => void;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const CONTINUOUS_LIMIT = 4 * HOUR + 30 * MINUTE;
const DAILY_LIMIT = 9 * HOUR;
const SHIFT_REFERENCE = 13 * HOUR;

const activityMeta: Record<Activity, { label: string; short: string; symbol: string }> = {
  drive: { label: "Vožnja", short: "VOŽNJA", symbol: "●" },
  work: { label: "Drugi rad", short: "RAD", symbol: "◆" },
  available: { label: "Raspoloživost", short: "POA", symbol: "◫" },
  rest: { label: "Pauza / odmor", short: "PAUZA", symbol: "Ⅱ" },
};

const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / HOUR);
  const minutes = Math.floor((safe % HOUR) / MINUTE);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const clampPercent = (value: number, limit: number) =>
  Math.min(100, Math.max(0, Math.round((value / limit) * 100)));

function MetricBar({
  label,
  value,
  hint,
  percent,
  tone = "cyan",
}: {
  label: string;
  value: string;
  hint: string;
  percent: number;
  tone?: "cyan" | "blue" | "amber" | "violet" | "red";
}) {
  return (
    <div className="metric">
      <div className="metric-head">
        <div>
          <span className="metric-label">{label}</span>
          <span className="metric-hint">{hint}</span>
        </div>
        <strong>{value}</strong>
      </div>
      <div className="metric-track" aria-hidden="true">
        <span className={`metric-fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function TachoCommandApp() {
  const [activity, setActivity] = useState<Activity>("drive");
  const [selectedTab, setSelectedTab] = useState<Tab>("cockpit");
  const [continuousDrive, setContinuousDrive] = useState(3 * HOUR + 42 * MINUTE);
  const [dailyDrive, setDailyDrive] = useState(6 * HOUR + 30 * MINUTE);
  const [shiftElapsed, setShiftElapsed] = useState(7 * HOUR + 15 * MINUTE);
  const [restElapsed, setRestElapsed] = useState(12 * MINUTE);
  const [demoMode, setDemoMode] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [deviceState, setDeviceState] = useState<DeviceState>("idle");
  const [device, setDevice] = useState<BleDevice | null>(null);
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([
    { id: "demo-4", activity: "drive", startedAt: "2026-08-18T15:18:00.000Z", source: "demo" },
    { id: "demo-3", activity: "rest", startedAt: "2026-08-18T14:33:00.000Z", source: "demo" },
    { id: "demo-2", activity: "drive", startedAt: "2026-08-18T12:06:00.000Z", source: "demo" },
    { id: "demo-1", activity: "work", startedAt: "2026-08-18T11:41:00.000Z", source: "demo" },
  ]);
  const latestManualState = useRef({ activity, continuousDrive, dailyDrive, shiftElapsed, restElapsed, events });

  useEffect(() => {
    latestManualState.current = { activity, continuousDrive, dailyDrive, shiftElapsed, restElapsed, events };
  }, [activity, continuousDrive, dailyDrive, shiftElapsed, restElapsed, events]);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setOnline(navigator.onLine);
      const saved = window.localStorage.getItem("tachocommand.manual.v1");
      if (saved) {
        try {
          const state = JSON.parse(saved) as Partial<typeof latestManualState.current>;
          if (state.activity && typeof state.continuousDrive === "number" && typeof state.dailyDrive === "number" && typeof state.shiftElapsed === "number") {
            setActivity(state.activity);
            setContinuousDrive(state.continuousDrive);
            setDailyDrive(state.dailyDrive);
            setShiftElapsed(state.shiftElapsed);
            setRestElapsed(state.restElapsed ?? 0);
            if (Array.isArray(state.events)) setEvents(state.events);
            setDemoMode(false);
          }
        } catch {
          window.localStorage.removeItem("tachocommand.manual.v1");
        }
      }
    }, 0);

    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    const installHandler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("beforeinstallprompt", installHandler);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.clearTimeout(hydrate);
    };
  }, []);

  useEffect(() => {
    if (demoMode) return;
    const persistence = window.setInterval(() => {
      window.localStorage.setItem("tachocommand.manual.v1", JSON.stringify(latestManualState.current));
    }, 10000);
    return () => window.clearInterval(persistence);
  }, [demoMode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setShiftElapsed((value) => value + 1);
      if (activity === "drive") {
        setContinuousDrive((value) => value + 1);
        setDailyDrive((value) => value + 1);
      }
      if (activity === "rest") setRestElapsed((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activity]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const remainingContinuous = CONTINUOUS_LIMIT - continuousDrive;
  const remainingDaily = DAILY_LIMIT - dailyDrive;
  const urgency = remainingContinuous <= 0 ? "over" : remainingContinuous <= 30 * MINUTE ? "soon" : "ok";
  const nextAction =
    urgency === "over"
      ? "Zaustavi vozilo i započni propisanu pauzu"
      : activity === "rest"
        ? "Pauza je u toku"
        : `Planiraj pauzu za ${formatClock(remainingContinuous)}`;

  const activityOptions = useMemo(() => Object.entries(activityMeta) as [Activity, (typeof activityMeta)[Activity]][], []);

  const chooseActivity = (next: Activity) => {
    setActivity(next);
    setDemoMode(false);
    if (next !== "rest") setRestElapsed(0);
    setEvents((current) => [
      { id: `${Date.now()}-${next}`, activity: next, startedAt: new Date().toISOString(), source: "manual" },
      ...current.filter((entry) => entry.source === "manual"),
    ].slice(0, 40));
    setNotice(`Ručni režim promenjen: ${activityMeta[next].label}. Tahograf ostaje zvanični izvor.`);
  };

  const connectBluetooth = async () => {
    const bluetooth = (navigator as Navigator & {
      bluetooth?: { requestDevice: (options: { acceptAllDevices: boolean }) => Promise<BleDevice> };
    }).bluetooth;
    if (!bluetooth) {
      setDeviceState("unsupported");
      setNotice("Web Bluetooth nije dostupan. Za test koristi ažurirani Chrome na Android telefonu preko HTTPS veze.");
      return;
    }
    try {
      setDeviceState("connecting");
      const selected = await bluetooth.requestDevice({ acceptAllDevices: true });
      selected.addEventListener("gattserverdisconnected", () => {
        setDeviceState("idle");
        setNotice("BLE veza je prekinuta. Nijedan tahografski podatak nije sačuvan kao verifikovan.");
      });
      if (!selected.gatt) throw new Error("GATT unavailable");
      await selected.gatt.connect();
      setDevice(selected);
      setDeviceState("linked");
      setNotice("BLE veza je uspostavljena. Tahografski protokol još nije verifikovan, zato cockpit ostaje u ručnom režimu.");
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === "NotFoundError";
      setDeviceState(cancelled ? "idle" : "error");
      setNotice(cancelled ? "Izbor uređaja je otkazan." : "BLE veza nije uspela. Aplikacija neće prikazati lažno povezivanje.");
    }
  };

  const disconnectBluetooth = () => {
    device?.gatt?.disconnect();
    setDevice(null);
    setDeviceState("idle");
    setNotice("BLE veza je bezbedno prekinuta.");
  };

  const installApp = async () => {
    if (!installPrompt) {
      setNotice("U Chrome meniju izaberi „Dodaj na početni ekran“. Aplikacija već ima PWA manifest.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setNotice(choice.outcome === "accepted" ? "TachoCommand je dodat na početni ekran." : "Instalacija je otkazana; možeš je pokrenuti kasnije.");
  };

  const saveManualTimes = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const duration = (prefix: string) => {
      const hours = Number(data.get(`${prefix}Hours`) ?? 0);
      const minutes = Number(data.get(`${prefix}Minutes`) ?? 0);
      return Math.max(0, hours * HOUR + Math.min(59, Math.max(0, minutes)) * MINUTE);
    };
    setContinuousDrive(duration("continuous"));
    setDailyDrive(duration("daily"));
    setShiftElapsed(duration("shift"));
    setDemoMode(false);
    setShowTimeEditor(false);
    setNotice("Ručna vremena su sačuvana samo na ovom uređaju.");
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="phone-stage" aria-label="TachoCommand vozačka aplikacija">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><span>TC</span></div>
            <div>
              <p className="eyebrow">DRIVER ASSISTANT</p>
              <h1>Tacho<span>Command</span></h1>
            </div>
          </div>
          <button
            className={`source-chip ${demoMode ? "demo" : "manual"}`}
            onClick={() => {
              if (demoMode) {
                setDemoMode(false);
                setShowTimeEditor(true);
              } else {
                setDemoMode(true);
                setActivity("drive");
                setContinuousDrive(3 * HOUR + 42 * MINUTE);
                setDailyDrive(6 * HOUR + 30 * MINUTE);
                setShiftElapsed(7 * HOUR + 15 * MINUTE);
                setRestElapsed(12 * MINUTE);
              }
              setNotice("Izvor je jasno označen. Demonstracija se nikada ne prikazuje kao podatak tahografa.");
            }}
            type="button"
            aria-label="Promeni prikaz izvora podataka"
          >
            <span /> {demoMode ? "DEMO" : "RUČNO"}
          </button>
        </header>

        <div className="truth-strip">
          <span className="truth-icon">i</span>
          <p><strong>Nije povezano sa tahografom.</strong> Prikazani podaci su {demoMode ? "demonstracioni" : "ručno vođeni"}.</p>
        </div>

        <div className={`screen-content ${selectedTab === "cockpit" ? "" : "hidden-screen"}`}>
          <section className={`hero-card ${urgency}`}>
            <div className="hero-topline">
              <div>
                <p className="section-kicker">SLEDEĆA BEZBEDNA ODLUKA</p>
                <h2>{nextAction}</h2>
              </div>
              <span className="live-pill"><i /> U TOKU</span>
            </div>

            <div className="countdown-row">
              <div className="countdown">
                <span>{urgency === "over" ? "PREKORAČENO" : activity === "rest" ? "PAUZA" : "DO PAUZE"}</span>
                <strong>{activity === "rest" ? formatClock(restElapsed) : formatClock(Math.abs(remainingContinuous))}</strong>
                <small>{activityMeta[activity].label} • ručni unos</small>
              </div>
              <div className="dial" style={{ "--progress": `${clampPercent(continuousDrive, CONTINUOUS_LIMIT) * 3.6}deg` } as React.CSSProperties}>
                <div><strong>{clampPercent(continuousDrive, CONTINUOUS_LIMIT)}</strong><span>%</span></div>
              </div>
            </div>

            <div className="hero-rule">
              <span>Referenca: 4 h 30 min kontinuirane vožnje</span>
              <button type="button" onClick={() => setNotice("Ovo je pomoćni prikaz. Uvek proveri tahograf i konkretne uslove svoje smene.")}>Zašto?</button>
            </div>
          </section>

          <section className="activity-card">
            <div className="section-title-row">
              <div>
                <p className="section-kicker">TRENUTNA AKTIVNOST</p>
                <h3>Ručni pomoćni zapis</h3>
              </div>
              <span className="local-badge">NA UREĐAJU</span>
            </div>
            <div className="activity-grid">
              {activityOptions.map(([key, meta]) => (
                <button
                  type="button"
                  key={key}
                  className={`activity-button ${key} ${activity === key ? "active" : ""}`}
                  onClick={() => chooseActivity(key)}
                  aria-pressed={activity === key}
                >
                  <span className="activity-symbol">{meta.symbol}</span>
                  <span>{meta.short}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="metrics-card">
            <div className="section-title-row compact">
              <div>
                <p className="section-kicker">PREGLED SMENE</p>
                <h3>Vreme na jednom mestu</h3>
              </div>
              <button className="text-button" type="button" onClick={() => setShowTimeEditor(true)}>Podesi</button>
            </div>
            <MetricBar
              label="Kontinuirana vožnja"
              hint="Referentna granica 04:30"
              value={`${formatClock(continuousDrive)} / 04:30`}
              percent={clampPercent(continuousDrive, CONTINUOUS_LIMIT)}
              tone={urgency === "over" ? "red" : urgency === "soon" ? "amber" : "cyan"}
            />
            <MetricBar
              label="Dnevna vožnja"
              hint={`Preostalo ${formatClock(remainingDaily)}`}
              value={`${formatClock(dailyDrive)} / 09:00`}
              percent={clampPercent(dailyDrive, DAILY_LIMIT)}
              tone="blue"
            />
            <MetricBar
              label="Trajanje smene"
              hint="Informativna referenca 13:00"
              value={`${formatClock(shiftElapsed)} / 13:00`}
              percent={clampPercent(shiftElapsed, SHIFT_REFERENCE)}
              tone="violet"
            />
          </section>

          <section className="connection-card">
            <div className="connection-copy">
              <span className="connection-icon">⌁</span>
              <div>
                <p className="section-kicker">TAHOGRAF VEZA</p>
                <h3>{deviceState === "linked" ? device?.name || "BLE uređaj povezan" : "Nije povezano"}</h3>
                <p>{deviceState === "linked" ? "BLE link postoji; tahografski protokol nije verifikovan." : "Proveri da li telefon i pregledač podržavaju bezbedan BLE pristup."}</p>
              </div>
            </div>
            <button type="button" className="primary-button" onClick={() => { setSelectedTab("device"); setNotice("Otvoren je centar za kompatibilnost uređaja."); }}>
              Proveri uređaj <span>→</span>
            </button>
          </section>

          <aside className="legal-note">
            <span>!</span>
            <p><strong>Važno:</strong> TachoCommand je pomoćni alat. Tahograf, kartica vozača i važeći propisi ostaju merodavni izvori.</p>
          </aside>
        </div>

        {selectedTab === "log" && (
          <section className="module-screen" aria-labelledby="log-title">
            <div className="module-heading">
              <div>
                <p className="section-kicker">LOKALNI DNEVNIK</p>
                <h2 id="log-title">Tok aktivnosti</h2>
                <p>Ručne promene ostaju na ovom telefonu. Ne menjaju zapis u tahografu.</p>
              </div>
              <span className={`network-badge ${online ? "online" : "offline"}`}>{online ? "ONLINE" : "OFFLINE"}</span>
            </div>

            <div className="summary-grid">
              <div><span>DANAS VOŽNJA</span><strong>{formatClock(dailyDrive)}</strong></div>
              <div><span>AKTIVNA SMENA</span><strong>{formatClock(shiftElapsed)}</strong></div>
            </div>

            <div className="timeline-card">
              {events.length === 0 ? (
                <div className="empty-state"><strong>Nema ručnih zapisa</strong><span>Promeni aktivnost u Cockpitu da započneš lokalni dnevnik.</span></div>
              ) : events.map((entry, index) => (
                <div className="timeline-entry" key={entry.id}>
                  <div className={`timeline-dot ${entry.activity}`}><span>{activityMeta[entry.activity].symbol}</span></div>
                  <div>
                    <strong>{activityMeta[entry.activity].label}</strong>
                    <span>{new Intl.DateTimeFormat("sr-RS", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(entry.startedAt))}</span>
                  </div>
                  <em>{entry.source === "demo" ? "DEMO" : index === 0 ? "SADA" : "RUČNO"}</em>
                </div>
              ))}
            </div>

            <aside className="legal-note"><span>i</span><p>Dnevnik je pomoćna beleška i nije zamena za potpisani `.DDD` fajl, karticu vozača ili memoriju jedinice vozila.</p></aside>
          </section>
        )}

        {selectedTab === "device" && (
          <section className="module-screen" aria-labelledby="device-title">
            <div className="module-heading">
              <div>
                <p className="section-kicker">CENTAR KOMPATIBILNOSTI</p>
                <h2 id="device-title">Tahograf i telefon</h2>
                <p>Prvo proveravamo bezbedan BLE link. Podatke ne nazivamo tahografskim dok protokol nije potvrđen.</p>
              </div>
              <span className={`device-orb ${deviceState}`} aria-hidden="true">⌁</span>
            </div>

            <div className="device-status-card">
              <div className="status-line">
                <span className={`status-light ${deviceState}`} />
                <div>
                  <strong>{
                    deviceState === "linked" ? "BLE veza uspostavljena" :
                    deviceState === "connecting" ? "Čekam izbor uređaja" :
                    deviceState === "unsupported" ? "Pregledač nije podržan" :
                    deviceState === "error" ? "Povezivanje nije uspelo" : "Spremno za proveru"
                  }</strong>
                  <span>{deviceState === "linked" ? device?.name || "Nepoznat BLE uređaj" : "Chrome za Android • bez dodatka • HTTPS"}</span>
                </div>
              </div>
              {deviceState === "linked" ? (
                <button className="secondary-button danger" type="button" onClick={disconnectBluetooth}>Prekini BLE vezu</button>
              ) : (
                <button className="primary-button" type="button" onClick={connectBluetooth} disabled={deviceState === "connecting"}>
                  {deviceState === "connecting" ? "Biranje uređaja…" : "Pokreni BLE proveru"} <span>→</span>
                </button>
              )}
            </div>

            <div className="truth-card">
              <p className="section-kicker">ŠTA JE POTVRĐENO</p>
              <ul>
                <li className="pass"><span>✓</span><div><strong>Smart Tacho 2 koristi Bluetooth Low Energy</strong><small>EU tehnička specifikacija zahteva BLE 5.0 ili noviji interfejs.</small></div></li>
                <li className="pass"><span>✓</span><div><strong>Vozač mora dati saglasnost</strong><small>Lični podaci nisu dostupni kroz ITS interfejs bez saglasnosti vozača.</small></div></li>
                <li className="pending"><span>…</span><div><strong>VDO / Stoneridge protokol</strong><small>Pravo čitanje zahteva test na fizičkom uređaju i proizvođačke identifikatore usluga.</small></div></li>
                <li className="blocked"><span>×</span><div><strong>Lažni `.DDD` je uklonjen</strong><small>Aplikacija neće generisati simulirani fajl sa zvaničnom ekstenzijom.</small></div></li>
              </ul>
            </div>

            <div className="steps-card">
              <p className="section-kicker">ZA TERENSKI TEST</p>
              <ol>
                <li><span>1</span>Android telefon sa ažuriranim Chrome pregledačem</li>
                <li><span>2</span>DTCO 4.1/4.1a ili SE5000 Smart 2 sa ubačenom karticom</li>
                <li><span>3</span>Uključena saglasnost za ITS lične podatke na tahografu</li>
                <li><span>4</span>Vozilo bezbedno parkirano tokom testa</li>
              </ol>
            </div>
          </section>
        )}

        {selectedTab === "more" && (
          <section className="module-screen" aria-labelledby="more-title">
            <div className="module-heading">
              <div>
                <p className="section-kicker">PODEŠAVANJA</p>
                <h2 id="more-title">Tvoj TachoCommand</h2>
                <p>Brz, lokalno orijentisan i transparentan prema vozaču.</p>
              </div>
              <div className="app-mini-mark">TC</div>
            </div>

            <div className="settings-list">
              <button type="button" onClick={installApp}><span className="setting-icon">⇩</span><div><strong>Instaliraj aplikaciju</strong><small>Dodaj TachoCommand na početni ekran</small></div><em>›</em></button>
              <button type="button" onClick={() => setShowTimeEditor(true)}><span className="setting-icon">◷</span><div><strong>Podesi ručna vremena</strong><small>Kontinuirana, dnevna vožnja i smena</small></div><em>›</em></button>
              <button type="button" onClick={() => setNotice(online ? "Mreža je dostupna. Ručni podaci se i dalje čuvaju samo lokalno." : "Offline režim je aktivan; Cockpit nastavlja da radi.")}><span className="setting-icon">◎</span><div><strong>Offline status</strong><small>{online ? "Mreža dostupna" : "Aplikacija radi bez mreže"}</small></div><em className={online ? "good" : "warn"}>●</em></button>
            </div>

            <div className="ad-boundary-card">
              <span>OGLASNI PROSTOR</span>
              <strong>Prihod bez pristupa vozačkim podacima</strong>
              <p>Oglasi će biti na odvojenom informativnom ekranu. Neće se učitavati u Bluetooth centru niti u aktivnom Cockpitu.</p>
            </div>

            <div className="about-card">
              <div><span>Verzija</span><strong>0.1 Pilot</strong></div>
              <div><span>Izvor podataka</span><strong>{demoMode ? "Demo" : "Ručni lokalni"}</strong></div>
              <div><span>Cloud nalog</span><strong>Nije potreban</strong></div>
            </div>

            <div className="source-card">
              <p className="section-kicker">PROVERENI IZVORI</p>
              <a href="https://eur-lex.europa.eu/eli/reg_impl/2021/1228/oj/eng" target="_blank" rel="noreferrer">EU 2021/1228 — Smart Tacho 2 i ITS/BLE <span>↗</span></a>
              <a href="https://developer.chrome.com/docs/capabilities/bluetooth" target="_blank" rel="noreferrer">Chrome — Web Bluetooth zahtevi <span>↗</span></a>
              <a href="https://www.fleet.vdo.com/support/faq/" target="_blank" rel="noreferrer">VDO — DTCO 4.1 Bluetooth <span>↗</span></a>
              <a href="https://stoneridge-tachographs.com/en/products/se5000-smart-2" target="_blank" rel="noreferrer">Stoneridge — SE5000 Smart 2 <span>↗</span></a>
            </div>
          </section>
        )}

        {showTimeEditor && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowTimeEditor(false); }}>
            <form className="editor-modal" onSubmit={saveManualTimes} aria-labelledby="editor-title">
              <div className="modal-heading">
                <div><p className="section-kicker">RUČNI IZVOR</p><h2 id="editor-title">Podesi vremena</h2></div>
                <button type="button" aria-label="Zatvori" onClick={() => setShowTimeEditor(false)}>×</button>
              </div>
              <p className="modal-explainer">Prepiši stanje sa tahografa samo kao ličnu pomoćnu belešku. Ovaj unos nije pravni dokaz.</p>
              {([
                ["continuous", "Kontinuirana vožnja", continuousDrive],
                ["daily", "Dnevna vožnja", dailyDrive],
                ["shift", "Trajanje smene", shiftElapsed],
              ] as [string, string, number][]).map(([key, label, value]) => (
                <fieldset key={key}>
                  <legend>{label}</legend>
                  <label><input name={`${key}Hours`} type="number" inputMode="numeric" min="0" max="99" defaultValue={Math.floor(value / HOUR)} /><span>sati</span></label>
                  <b>:</b>
                  <label><input name={`${key}Minutes`} type="number" inputMode="numeric" min="0" max="59" defaultValue={Math.floor((value % HOUR) / MINUTE)} /><span>min</span></label>
                </fieldset>
              ))}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowTimeEditor(false)}>Otkaži</button>
                <button type="submit" className="primary-button">Sačuvaj ručno</button>
              </div>
            </form>
          </div>
        )}

        <nav className="bottom-nav" aria-label="Glavna navigacija">
          {([
            ["cockpit", "▦", "Cockpit"],
            ["log", "≡", "Dnevnik"],
            ["device", "⌁", "Uređaj"],
            ["more", "•••", "Više"],
          ] as [Tab, string, string][]).map(([tab, icon, label]) => (
            <button
              type="button"
              key={tab}
              className={selectedTab === tab ? "active" : ""}
              aria-current={selectedTab === tab ? "page" : undefined}
              onClick={() => {
                setSelectedTab(tab);
              }}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>

        {notice && <div className="toast" role="status">{notice}</div>}
      </section>
    </main>
  );
}
