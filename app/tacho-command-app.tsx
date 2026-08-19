"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveLocale, translations } from "../lib/i18n.js";
import type { Locale } from "../lib/i18n.js";
import { evaluateDrivingSnapshot } from "../lib/tacho-rules.js";
import {
  buildCompatibilityReport,
  classifyTachoServices,
  classifyTachoTransport,
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../lib/tacho-ble.js";
import AccessGate from "./access-gate";

type Activity = "drive" | "work" | "available" | "rest";
type Tab = "cockpit" | "log" | "device" | "more";
type DeviceState = "idle" | "connecting" | "linked" | "unsupported" | "error";
type FieldTestProfile = {
  vehicleType: "bus" | "truck" | "other";
  tachoBrand: "vdo" | "stoneridge" | "other";
  tachoModel: string;
};
type BleTestEvent = {
  at: string;
  event: "connection-attempt" | "device-selected" | "gatt-connected" | "services-scanned" | "characteristics-scanned" | "indications-enabled" | "client-credit-sent" | "server-credit-received" | "flow-control-rejected" | "flow-control-timeout" | "flow-control-error" | "disconnected" | "cancelled" | "connection-error";
};

type FlowControlState = "idle" | "arming" | "waiting" | "ready" | "rejected" | "timeout" | "error";

type ActivityEvent = {
  id: string;
  activity: Activity;
  startedAt: string;
  source: "demo" | "manual";
};

type BleGattCharacteristic = {
  uuid: string;
  value?: DataView | null;
  startNotifications: () => Promise<BleGattCharacteristic>;
  writeValueWithResponse: (value: BufferSource) => Promise<void>;
  addEventListener: (type: "characteristicvaluechanged", listener: (event: Event) => void) => void;
};
type BlePrimaryService = { uuid: string; getCharacteristics: () => Promise<BleGattCharacteristic[]> };
type BleGattServer = {
  connected: boolean;
  connect: () => Promise<BleGattServer>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BlePrimaryService[]>;
};

type BleDevice = {
  id: string;
  name?: string;
  gatt?: BleGattServer;
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
  const [locale, setLocale] = useState<Locale>("sr");
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
  const [detectedServiceUuids, setDetectedServiceUuids] = useState<string[]>([]);
  const [detectedCharacteristics, setDetectedCharacteristics] = useState<Array<{ serviceUuid: string; characteristicUuids: string[] }>>([]);
  const [protocolServiceDetected, setProtocolServiceDetected] = useState<boolean | null>(null);
  const [transportReady, setTransportReady] = useState<boolean | null>(null);
  const [flowControlState, setFlowControlState] = useState<FlowControlState>("idle");
  const [diagnosticsFifoIndications, setDiagnosticsFifoIndications] = useState(false);
  const [diagnosticsCreditsIndications, setDiagnosticsCreditsIndications] = useState(false);
  const [clientCreditsGranted, setClientCreditsGranted] = useState(0);
  const [serverCreditsReceived, setServerCreditsReceived] = useState<number[]>([]);
  const [fieldTestProfile, setFieldTestProfile] = useState<FieldTestProfile>({ vehicleType: "bus", tachoBrand: "vdo", tachoModel: "" });
  const [bleTestEvents, setBleTestEvents] = useState<BleTestEvent[]>([]);
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([
    { id: "demo-4", activity: "drive", startedAt: "2026-08-18T15:18:00.000Z", source: "demo" },
    { id: "demo-3", activity: "rest", startedAt: "2026-08-18T14:33:00.000Z", source: "demo" },
    { id: "demo-2", activity: "drive", startedAt: "2026-08-18T12:06:00.000Z", source: "demo" },
    { id: "demo-1", activity: "work", startedAt: "2026-08-18T11:41:00.000Z", source: "demo" },
  ]);
  const latestManualState = useRef({ activity, continuousDrive, dailyDrive, shiftElapsed, restElapsed, events });
  const lastTickAt = useRef(0);

  useEffect(() => {
    latestManualState.current = { activity, continuousDrive, dailyDrive, shiftElapsed, restElapsed, events };
  }, [activity, continuousDrive, dailyDrive, shiftElapsed, restElapsed, events]);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setOnline(navigator.onLine);
      setInstalled(window.matchMedia("(display-mode: standalone)").matches);
      setLocale(resolveLocale(window.localStorage.getItem("tachocommand.locale"), navigator.language));
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
      const savedFieldTest = window.localStorage.getItem("tachocommand.field-test.v2");
      if (savedFieldTest) {
        try {
          const state = JSON.parse(savedFieldTest) as { profile?: FieldTestProfile; events?: BleTestEvent[] };
          if (state.profile) setFieldTestProfile(state.profile);
          if (Array.isArray(state.events)) setBleTestEvents(state.events.slice(-40));
        } catch {
          window.localStorage.removeItem("tachocommand.field-test.v2");
        }
      }
    }, 0);

    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    const installHandler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
      window.clearTimeout(hydrate);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tachocommand.locale", locale);
    document.documentElement.lang = locale === "sr" ? "sr-Latn" : locale;
  }, [locale]);

  useEffect(() => {
    if (demoMode) return;
    const persistence = window.setInterval(() => {
      window.localStorage.setItem("tachocommand.manual.v1", JSON.stringify(latestManualState.current));
    }, 10000);
    return () => window.clearInterval(persistence);
  }, [demoMode]);

  useEffect(() => {
    window.localStorage.setItem("tachocommand.field-test.v2", JSON.stringify({ profile: fieldTestProfile, events: bleTestEvents.slice(-40) }));
  }, [fieldTestProfile, bleTestEvents]);

  useEffect(() => {
    lastTickAt.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTickAt.current) / 1000);
      if (elapsedSeconds < 1) return;
      lastTickAt.current += elapsedSeconds * 1000;
      setShiftElapsed((value) => value + elapsedSeconds);
      if (activity === "drive") {
        setContinuousDrive((value) => value + elapsedSeconds);
        setDailyDrive((value) => value + elapsedSeconds);
      }
      if (activity === "rest") setRestElapsed((value) => value + elapsedSeconds);
    };
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [activity]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const t = translations[locale];
  const activityMeta = useMemo<Record<Activity, { label: string; short: string; symbol: string }>>(() => ({
    drive: { label: t.activityDrive, short: t.activityDriveShort, symbol: "●" },
    work: { label: t.activityWork, short: t.activityWorkShort, symbol: "◆" },
    available: { label: t.activityAvailable, short: "POA", symbol: "◫" },
    rest: { label: t.activityRest, short: t.activityRestShort, symbol: "Ⅱ" },
  }), [t]);

  const ruleResults = useMemo(() => evaluateDrivingSnapshot({
    continuousDriveSeconds: continuousDrive,
    dailyDriveSeconds: dailyDrive,
    weeklyDriveSeconds: 0,
    fortnightlyDriveSeconds: 0,
    currentBreakSeconds: restElapsed,
  }), [continuousDrive, dailyDrive, restElapsed]);
  const continuousRule = ruleResults.rules.find((rule) => rule.id === "continuous-driving");
  const dailyRule = ruleResults.rules.find((rule) => rule.id === "daily-driving");
  const remainingContinuous = continuousRule?.remainingSeconds ?? CONTINUOUS_LIMIT - continuousDrive;
  const remainingDaily = dailyRule?.remainingSeconds ?? DAILY_LIMIT - dailyDrive;
  const urgency = continuousRule?.status === "exceeded" || continuousRule?.status === "limit"
    ? "over"
    : continuousRule?.status === "warning" ? "soon" : "ok";
  const nextAction =
    urgency === "over"
      ? t.stopAndBreak
      : activity === "rest"
        ? t.pauseInProgress
        : t.planBreak.replace("{time}", formatClock(remainingContinuous));

  const activityOptions = useMemo(() => Object.entries(activityMeta) as [Activity, (typeof activityMeta)[Activity]][], [activityMeta]);

  const addBleTestEvent = (event: BleTestEvent["event"]) => {
    setBleTestEvents((current) => [...current, { at: new Date().toISOString(), event }].slice(-40));
  };

  const chooseActivity = (next: Activity) => {
    setActivity(next);
    setDemoMode(false);
    if (next !== "rest") setRestElapsed(0);
    setEvents((current) => [
      { id: `${Date.now()}-${next}`, activity: next, startedAt: new Date().toISOString(), source: "manual" },
      ...current.filter((entry) => entry.source === "manual"),
    ].slice(0, 40));
    setNotice(`${t.modeChanged}: ${activityMeta[next].label}. ${t.officialSource}.`);
  };

  const connectBluetooth = async () => {
    const bluetooth = (navigator as Navigator & {
      bluetooth?: { requestDevice: (options: { acceptAllDevices: boolean; optionalServices: readonly string[] }) => Promise<BleDevice> };
    }).bluetooth;
    if (!bluetooth) {
      setDeviceState("unsupported");
      setNotice("Web Bluetooth nije dostupan. Za test koristi ažurirani Chrome na Android telefonu preko HTTPS veze.");
      return;
    }
    let linkEstablished = false;
    try {
      setFlowControlState("idle");
      setDiagnosticsFifoIndications(false);
      setDiagnosticsCreditsIndications(false);
      setClientCreditsGranted(0);
      setServerCreditsReceived([]);
      addBleTestEvent("connection-attempt");
      setDeviceState("connecting");
      const selected = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS,
      });
      addBleTestEvent("device-selected");
      selected.addEventListener("gattserverdisconnected", () => {
        addBleTestEvent("disconnected");
        setDeviceState("idle");
        setNotice("BLE veza je prekinuta. Nijedan tahografski podatak nije sačuvan kao verifikovan.");
      });
      if (!selected.gatt) throw new Error("GATT unavailable");
      const server = await selected.gatt.connect();
      addBleTestEvent("gatt-connected");
      let serviceUuids: string[] = [];
      let serviceCharacteristics: Array<{ serviceUuid: string; characteristicUuids: string[] }> = [];
      let diagnosticsCharacteristics: BleGattCharacteristic[] = [];
      try {
        const services = await server.getPrimaryServices();
        serviceUuids = services.map((service) => service.uuid);
        const standardServices = services.filter((service) => TACHO_OPTIONAL_SERVICE_UUIDS.includes(service.uuid.toLowerCase()));
        serviceCharacteristics = await Promise.all(standardServices.map(async (service) => {
          try {
            const characteristics = await service.getCharacteristics();
            if (service.uuid.toLowerCase() === TACHO_DIAGNOSTICS_SERVICE_UUID) diagnosticsCharacteristics = characteristics;
            return { serviceUuid: service.uuid, characteristicUuids: characteristics.map((characteristic) => characteristic.uuid) };
          } catch {
            return { serviceUuid: service.uuid, characteristicUuids: [] };
          }
        }));
      } catch {
        serviceUuids = [];
        serviceCharacteristics = [];
      }
      const classification = classifyTachoServices(serviceUuids);
      const transport = classifyTachoTransport(serviceCharacteristics);
      addBleTestEvent("services-scanned");
      addBleTestEvent("characteristics-scanned");
      setDetectedServiceUuids(classification.normalizedServices);
      setDetectedCharacteristics(transport.serviceCharacteristics.map((entry) => ({ serviceUuid: entry.serviceUuid, characteristicUuids: [...entry.characteristicUuids] })));
      setProtocolServiceDetected(classification.hasStandardTachoService);
      setTransportReady(transport.transportReady);
      setDevice(selected);
      setDeviceState("linked");
      linkEstablished = true;
      if (transport.transportReady) {
        setFlowControlState("arming");
        const fifo = diagnosticsCharacteristics.find((characteristic) => characteristic.uuid.toLowerCase() === TACHO_DIAGNOSTICS_FIFO_UUID);
        const credits = diagnosticsCharacteristics.find((characteristic) => characteristic.uuid.toLowerCase() === TACHO_DIAGNOSTICS_CREDITS_UUID);
        if (!fifo || !credits) throw new Error("Diagnostics characteristics unavailable");

        let resolveServerCredit: ((value: number) => void) | null = null;
        const serverCredit = new Promise<number>((resolve) => { resolveServerCredit = resolve; });
        credits.addEventListener("characteristicvaluechanged", (event) => {
          const characteristic = event.target as BleGattCharacteristic | null;
          const value = characteristic?.value?.byteLength ? characteristic.value.getUint8(0) : null;
          if (value === null) return;
          setServerCreditsReceived((current) => [...current, value].slice(-20));
          if (value === 0xff) {
            addBleTestEvent("flow-control-rejected");
            setFlowControlState("rejected");
          } else {
            addBleTestEvent("server-credit-received");
            if (value > 0) setFlowControlState("ready");
          }
          resolveServerCredit?.(value);
          resolveServerCredit = null;
        });

        await credits.startNotifications();
        setDiagnosticsCreditsIndications(true);
        await fifo.startNotifications();
        setDiagnosticsFifoIndications(true);
        addBleTestEvent("indications-enabled");
        setFlowControlState("waiting");
        await credits.writeValueWithResponse(Uint8Array.of(1));
        setClientCreditsGranted(1);
        addBleTestEvent("client-credit-sent");

        const received = await Promise.race<number | null>([
          serverCredit,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 6000)),
        ]);
        if (received === null) {
          addBleTestEvent("flow-control-timeout");
          setFlowControlState("timeout");
          setNotice("Transport je pronađen, ali tahograf nije vratio kredit u roku od 6 sekundi. Podaci nisu traženi.");
        } else if (received === 0xff) {
          setNotice("Tahograf je odbio dijagnostički transport. Podaci nisu traženi niti menjani.");
        } else if (received > 0) {
          setNotice(`Dijagnostički transport je prihvaćen (${received} kredit${received === 1 ? "" : "a"}). Nijedan tahografski podatak još nije tražen.`);
        }
      } else {
        setNotice(classification.hasStandardTachoService ? t.protocolServiceDetected : t.protocolServiceMissing);
      }
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === "NotFoundError";
      const flowControlFailure = !cancelled && linkEstablished;
      addBleTestEvent(cancelled ? "cancelled" : flowControlFailure ? "flow-control-error" : "connection-error");
      if (flowControlFailure) setFlowControlState("error");
      setDeviceState(cancelled ? "idle" : flowControlFailure ? "linked" : "error");
      setNotice(cancelled ? "Izbor uređaja je otkazan." : flowControlFailure ? "BLE veza postoji, ali credit handshake nije uspeo. Podaci nisu traženi." : "BLE veza nije uspela. Aplikacija neće prikazati lažno povezivanje.");
    }
  };

  const copyCompatibilityReport = async () => {
    const firstEventAt = bleTestEvents[0]?.at;
    const report = buildCompatibilityReport({
      createdAt: new Date().toISOString(),
      appVersion: "0.5-credit-handshake",
      locale,
      ...fieldTestProfile,
      deviceName: device?.name,
      userAgent: navigator.userAgent,
      serviceUuids: detectedServiceUuids,
      serviceCharacteristics: detectedCharacteristics,
      flowControl: {
        attempted: flowControlState !== "idle",
        diagnosticsFifoIndications,
        diagnosticsCreditsIndications,
        clientCreditsGranted,
        serverCredits: serverCreditsReceived,
      },
      connectionState: deviceState,
      sessionStartedAt: firstEventAt,
      sessionDurationSeconds: firstEventAt ? (Date.now() - new Date(firstEventAt).getTime()) / 1000 : 0,
      attemptCount: bleTestEvents.filter((entry) => entry.event === "connection-attempt").length,
      disconnectCount: bleTestEvents.filter((entry) => entry.event === "disconnected").length,
      events: bleTestEvents,
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setNotice(t.reportCopied);
    } catch {
      setNotice(t.reportCopyFailed);
    }
  };

  const disconnectBluetooth = () => {
    device?.gatt?.disconnect();
    setDevice(null);
    setDetectedServiceUuids([]);
    setDetectedCharacteristics([]);
    setProtocolServiceDetected(null);
    setTransportReady(null);
    setFlowControlState("idle");
    setDiagnosticsFifoIndications(false);
    setDiagnosticsCreditsIndications(false);
    setClientCreditsGranted(0);
    setServerCreditsReceived([]);
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
    if (choice.outcome === "accepted") setInstalled(true);
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
    <AccessGate>
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="phone-stage" aria-label="TachoCommand vozačka aplikacija">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><span>TC</span></div>
            <div>
              <p className="eyebrow">{t.driverAssistant}</p>
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
            <span /> {demoMode ? t.sourceDemo : t.sourceManual}
          </button>
        </header>

        <div className="truth-strip">
          <span className="truth-icon">i</span>
          <p><strong>{t.truthNotConnected}</strong> {t.truthShownData} {demoMode ? t.truthDemo : t.truthManual}.</p>
        </div>

        <div className={`screen-content ${selectedTab === "cockpit" ? "" : "hidden-screen"}`}>
          <section className={`hero-card ${urgency}`}>
            <div className="hero-topline">
              <div>
                <p className="section-kicker">{t.nextSafeDecision}</p>
                <h2>{nextAction}</h2>
              </div>
              <span className="live-pill"><i /> {t.inProgress}</span>
            </div>

            <div className="countdown-row">
              <div className="countdown">
                <span>{urgency === "over" ? t.exceeded : activity === "rest" ? t.pause : t.untilBreak}</span>
                <strong>{activity === "rest" ? formatClock(restElapsed) : formatClock(Math.abs(remainingContinuous))}</strong>
                <small>{activityMeta[activity].label} • {t.manualInput}</small>
              </div>
              <div className="dial" style={{ "--progress": `${clampPercent(continuousDrive, CONTINUOUS_LIMIT) * 3.6}deg` } as React.CSSProperties}>
                <div><strong>{clampPercent(continuousDrive, CONTINUOUS_LIMIT)}</strong><span>%</span></div>
              </div>
            </div>

            <div className="hero-rule">
              <span>{t.continuousReference} • {ruleResults.rulesetId}</span>
              <button type="button" onClick={() => setNotice("Ovo je pomoćni prikaz. Uvek proveri tahograf i konkretne uslove svoje smene.")}>{t.why}</button>
            </div>
          </section>

          <section className="activity-card">
            <div className="section-title-row">
              <div>
                <p className="section-kicker">{t.currentActivity}</p>
                <h3>{t.manualHelper}</h3>
              </div>
              <span className="local-badge">{t.onDevice}</span>
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
                <p className="section-kicker">{t.shiftOverview}</p>
                <h3>{t.timeOnePlace}</h3>
              </div>
              <button className="text-button" type="button" onClick={() => setShowTimeEditor(true)}>{t.adjust}</button>
            </div>
            <MetricBar
              label={t.continuousDrive}
              hint={t.referenceLimit}
              value={`${formatClock(continuousDrive)} / 04:30`}
              percent={clampPercent(continuousDrive, CONTINUOUS_LIMIT)}
              tone={urgency === "over" ? "red" : urgency === "soon" ? "amber" : "cyan"}
            />
            <MetricBar
              label={t.dailyDrive}
              hint={`${t.remaining} ${formatClock(remainingDaily)}`}
              value={`${formatClock(dailyDrive)} / 09:00`}
              percent={clampPercent(dailyDrive, DAILY_LIMIT)}
              tone="blue"
            />
            <MetricBar
              label={t.shiftDuration}
              hint={t.shiftReference}
              value={`${formatClock(shiftElapsed)} / 13:00`}
              percent={clampPercent(shiftElapsed, SHIFT_REFERENCE)}
              tone="violet"
            />
          </section>

          <section className="connection-card">
            <div className="connection-copy">
              <span className="connection-icon">⌁</span>
              <div>
                <p className="section-kicker">{t.tachoConnection}</p>
                <h3>{deviceState === "linked" ? device?.name || "BLE uređaj povezan" : t.notConnected}</h3>
                <p>{deviceState === "linked" ? "BLE link postoji; tahografski protokol nije verifikovan." : "Proveri da li telefon i pregledač podržavaju bezbedan BLE pristup."}</p>
              </div>
            </div>
            <button type="button" className="primary-button" onClick={() => { setSelectedTab("device"); setNotice("Otvoren je centar za kompatibilnost uređaja."); }}>
              {t.checkDevice} <span>→</span>
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
                    <span>{new Intl.DateTimeFormat(locale === "sr" ? "sr-Latn-RS" : locale === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(entry.startedAt))}</span>
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

            <div className="field-profile-card">
              <div>
                <p className="section-kicker">ANONIMNI PROFIL TESTA</p>
                <h3>Koji uređaj proveravamo?</h3>
                <p>Čuva se samo na ovom telefonu i ulazi u beta izveštaj bez imena, kartice, registracije i lokacije.</p>
              </div>
              <div className="field-profile-grid">
                <label>VOZILO
                  <select value={fieldTestProfile.vehicleType} onChange={(event) => setFieldTestProfile((current) => ({ ...current, vehicleType: event.target.value as FieldTestProfile["vehicleType"] }))}>
                    <option value="bus">Autobus</option>
                    <option value="truck">Kamion</option>
                    <option value="other">Drugo</option>
                  </select>
                </label>
                <label>TAHOGRAF
                  <select value={fieldTestProfile.tachoBrand} onChange={(event) => setFieldTestProfile((current) => ({ ...current, tachoBrand: event.target.value as FieldTestProfile["tachoBrand"] }))}>
                    <option value="vdo">VDO / DTCO</option>
                    <option value="stoneridge">Stoneridge</option>
                    <option value="other">Drugi</option>
                  </select>
                </label>
                <label className="field-profile-model">MODEL / VERZIJA (AKO JE POZNATA)
                  <input value={fieldTestProfile.tachoModel} onChange={(event) => setFieldTestProfile((current) => ({ ...current, tachoModel: event.target.value.slice(0, 60) }))} placeholder="npr. DTCO 4.1a" />
                </label>
              </div>
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

            {bleTestEvents.length > 0 && (
              <button className="secondary-button" type="button" onClick={copyCompatibilityReport}>
                {t.copyBetaReport}
              </button>
            )}

            {bleTestEvents.length > 0 && (
              <div className="field-session-strip" aria-label="Sažetak beta testa">
                <div><span>POKUŠAJI</span><strong>{bleTestEvents.filter((entry) => entry.event === "connection-attempt").length}</strong></div>
                <div><span>PREKIDI</span><strong>{bleTestEvents.filter((entry) => entry.event === "disconnected").length}</strong></div>
                <div><span>EU SERVIS</span><strong>{protocolServiceDetected === true ? "DA" : protocolServiceDetected === false ? "NE" : "—"}</strong></div>
                <div><span>TRANSPORT</span><strong>{transportReady === true ? "4/4" : transportReady === false ? "NE" : "—"}</strong></div>
                <div><span>HANDSHAKE</span><strong>{flowControlState === "ready" ? "DA" : flowControlState === "rejected" ? "ODBIJEN" : flowControlState === "error" || flowControlState === "timeout" ? "NE" : flowControlState === "idle" ? "—" : "…"}</strong></div>
              </div>
            )}

            <div className="truth-card">
              <p className="section-kicker">ŠTA JE POTVRĐENO</p>
              <ul>
                <li className="pass"><span>✓</span><div><strong>Smart Tacho 2 koristi Bluetooth Low Energy</strong><small>EU tehnička specifikacija zahteva BLE 5.0 ili noviji interfejs.</small></div></li>
                <li className="pass"><span>✓</span><div><strong>Vozač mora dati saglasnost</strong><small>Lični podaci nisu dostupni kroz ITS interfejs bez saglasnosti vozača.</small></div></li>
                <li className={protocolServiceDetected === true ? "pass" : "pending"}>
                  <span>{protocolServiceDetected === true ? "✓" : "…"}</span>
                  <div>
                    <strong>EU Smart Tacho 2 GATT servisi</strong>
                    <small>{protocolServiceDetected === true
                      ? t.protocolServiceDetected
                      : protocolServiceDetected === false
                        ? t.protocolServiceMissing
                        : "Čeka se kontrolisani test na fizičkom uređaju."}</small>
                  </div>
                </li>
                <li className={transportReady === true ? "pass" : "pending"}>
                  <span>{transportReady === true ? "✓" : "…"}</span>
                  <div>
                    <strong>FIFO/Credits karakteristike</strong>
                    <small>{transportReady === true
                      ? "Pronađene su sve četiri standardne transportne karakteristike."
                      : transportReady === false
                        ? "Servis postoji, ali kompletan transportni skup nije vidljiv. Sačuvaj novi beta izveštaj."
                        : "Čeka se read-only provera karakteristika."}</small>
                  </div>
                </li>
                <li className={flowControlState === "ready" ? "pass" : flowControlState === "rejected" || flowControlState === "error" || flowControlState === "timeout" ? "blocked" : "pending"}>
                  <span>{flowControlState === "ready" ? "✓" : flowControlState === "rejected" || flowControlState === "error" || flowControlState === "timeout" ? "×" : "…"}</span>
                  <div>
                    <strong>Dijagnostički credit handshake</strong>
                    <small>{flowControlState === "ready"
                      ? `Tahograf je prihvatio transport i vratio kredit (${serverCreditsReceived.at(-1)}). Nijedan podatak još nije tražen.`
                      : flowControlState === "rejected"
                        ? "Tahograf je vratio 0xFF i odbio transport."
                        : flowControlState === "timeout"
                          ? "Indications su uključene, ali kredit nije stigao u roku od 6 sekundi."
                          : flowControlState === "error"
                            ? "Credit handshake nije uspeo; BLE veza može i dalje biti aktivna."
                            : flowControlState === "arming" || flowControlState === "waiting"
                              ? "U toku je standardna FIFO/Credits sekvenca."
                              : "Čeka se kontrolisani test dok vozilo stoji."}</small>
                  </div>
                </li>
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
                <h2 id="more-title">{t.yourTachoCommand}</h2>
                <p>{t.fastLocalTransparent}</p>
              </div>
              <div className="app-mini-mark">TC</div>
            </div>

            <div className="settings-list">
              {installed ? (
                <div className="installed-setting"><span className="setting-icon">✓</span><div><strong>Aplikacija je instalirana</strong><small>Pokrenuta je kao samostalna mobilna aplikacija</small></div><em className="good">●</em></div>
              ) : (
                <button type="button" onClick={installApp}><span className="setting-icon">⇩</span><div><strong>Instaliraj aplikaciju</strong><small>Dodaj TachoCommand na početni ekran</small></div><em>›</em></button>
              )}
              <button type="button" onClick={() => setShowTimeEditor(true)}><span className="setting-icon">◷</span><div><strong>Podesi ručna vremena</strong><small>Kontinuirana, dnevna vožnja i smena</small></div><em>›</em></button>
              <button type="button" onClick={() => setNotice(online ? "Mreža je dostupna. Ručni podaci se i dalje čuvaju samo lokalno." : "Offline režim je aktivan; Cockpit nastavlja da radi.")}><span className="setting-icon">◎</span><div><strong>Offline status</strong><small>{online ? "Mreža dostupna" : "Aplikacija radi bez mreže"}</small></div><em className={online ? "good" : "warn"}>●</em></button>
              <label className="language-setting">
                <span className="setting-icon">文</span>
                <div><strong>{t.language}</strong><small>{t.languageHint}</small></div>
                <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t.language}>
                  <option value="sr">{t.languageSr}</option>
                  <option value="en">{t.languageEn}</option>
                  <option value="de">{t.languageDe}</option>
                </select>
              </label>
            </div>

            <div className="ad-boundary-card">
              <span>OGLASNI PROSTOR</span>
              <strong>Prihod bez pristupa vozačkim podacima</strong>
              <p>Oglasi će biti na odvojenom informativnom ekranu. Neće se učitavati u Bluetooth centru niti u aktivnom Cockpitu.</p>
            </div>

            <div className="about-card">
              <div><span>{t.version}</span><strong>0.5 Credit Handshake</strong></div>
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
            ["cockpit", "▦", t.navCockpit],
            ["log", "≡", t.navLog],
            ["device", "⌁", t.navDevice],
            ["more", "•••", t.navMore],
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
    </AccessGate>
  );
}
