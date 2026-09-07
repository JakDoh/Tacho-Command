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
  event: "connection-attempt" | "device-selected" | "gatt-connected" | "services-scanned" | "characteristics-scanned" | "indications-enabled" | "client-credit-write-fallback" | "client-credit-sent" | "server-credit-received" | "flow-control-rejected" | "flow-control-timeout" | "flow-control-error" | "tester-present-write-fallback" | "tester-present-sent" | "tester-present-response" | "tester-present-timeout" | "application-probe-error" | "diagnostic-session-sent" | "diagnostic-session-packet-observed" | "diagnostic-session-positive" | "diagnostic-session-negative" | "diagnostic-session-timeout" | "rhmi-open-sent" | "rhmi-open-accepted" | "rhmi-open-negative" | "rhmi-status-query-sent" | "rhmi-status-open" | "rhmi-status-closed" | "rhmi-timeout" | "rhmi-error" | "driver-card-read-sent" | "driver-card-read-packet-observed" | "driver-card-read-positive" | "driver-card-read-negative" | "driver-card-read-timeout" | "disconnected" | "cancelled" | "connection-error";
};

type FifoPacketObservation = {
  byteLength: number;
  packetHeaderValid: boolean;
  responseService: number | null;
  requestService: number | null;
  negativeResponseCode: number | null;
};

type DriverCardReadResult = {
  did: string;
  name: string;
  status: "positive" | "negative" | "timeout" | "unexpected";
  value: number | null;
  unit: "state" | "minutes";
  activity: Activity | "unknown" | null;
  negativeResponseCode: number | null;
  observations: FifoPacketObservation[];
};

type FlowControlState = "idle" | "arming" | "waiting" | "ready" | "rejected" | "timeout" | "error";
type ApplicationProbeState = "idle" | "waiting" | "positive" | "negative" | "unexpected" | "timeout" | "error";
type DiagnosticSessionState = "idle" | "waiting" | "positive" | "negative" | "unexpected" | "timeout" | "error";
type RemoteHmiState = "idle" | "requesting" | "pending" | "open" | "rejected" | "blocked" | "timeout" | "error";

type ActivityEvent = {
  id: string;
  activity: Activity;
  startedAt: string;
  source: "demo" | "manual";
};

type BleGattCharacteristic = {
  uuid: string;
  value?: DataView | null;
  properties?: { write?: boolean; writeWithoutResponse?: boolean; indicate?: boolean; notify?: boolean };
  startNotifications: () => Promise<BleGattCharacteristic>;
  writeValue?: (value: BufferSource) => Promise<void>;
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
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

async function writeGattByMethod(characteristic: BleGattCharacteristic, method: string, value: Uint8Array) {
  if (method === "with-response" && characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
  if (method === "without-response" && characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
  if (method === "legacy-auto" && characteristic.writeValue) return characteristic.writeValue(value);
  throw new DOMException("Previously verified GATT write method is unavailable", "NotSupportedError");
}

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
  const [locale, setLocale] = useState<Locale>("cs");
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
  const [creditWriteCapabilities, setCreditWriteCapabilities] = useState({ write: false, writeWithoutResponse: false });
  const [creditWriteAttempts, setCreditWriteAttempts] = useState<string[]>([]);
  const [creditWriteMethod, setCreditWriteMethod] = useState("not-used");
  const [flowControlError, setFlowControlError] = useState({ name: "none", message: "none" });
  const [applicationProbeState, setApplicationProbeState] = useState<ApplicationProbeState>("idle");
  const [fifoWriteCapabilities, setFifoWriteCapabilities] = useState({ write: false, writeWithoutResponse: false });
  const [fifoWriteAttempts, setFifoWriteAttempts] = useState<string[]>([]);
  const [fifoWriteMethod, setFifoWriteMethod] = useState("not-used");
  const [applicationProbeResponse, setApplicationProbeResponse] = useState({ packetHeaderValid: false, responseType: "none", responseService: null as number | null, negativeResponseCode: null as number | null });
  const [applicationProbeError, setApplicationProbeError] = useState({ name: "none", message: "none" });
  const [diagnosticSessionState, setDiagnosticSessionState] = useState<DiagnosticSessionState>("idle");
  const [diagnosticSessionResponse, setDiagnosticSessionResponse] = useState({ packetHeaderValid: false, responseType: "none", responseService: null as number | null, responseSubFunction: null as number | null, negativeResponseCode: null as number | null });
  const [diagnosticSessionError, setDiagnosticSessionError] = useState({ name: "none", message: "none" });
  const [diagnosticSessionObservations, setDiagnosticSessionObservations] = useState<FifoPacketObservation[]>([]);
  const [remoteHmiState, setRemoteHmiState] = useState<RemoteHmiState>("idle");
  const [remoteHmiStartResponse, setRemoteHmiStartResponse] = useState("none");
  const [remoteHmiStatusCode, setRemoteHmiStatusCode] = useState<number | null>(null);
  const [remoteHmiPollCount, setRemoteHmiPollCount] = useState(0);
  const [remoteHmiRecoveryStatusQueried, setRemoteHmiRecoveryStatusQueried] = useState(false);
  const [remoteHmiError, setRemoteHmiError] = useState({ name: "none", message: "none" });
  const [driverCardReadResults, setDriverCardReadResults] = useState<DriverCardReadResult[]>([]);
  const [driverCardReadAttempted, setDriverCardReadAttempted] = useState(false);
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
    document.documentElement.lang = locale;
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
    available: { label: t.activityAvailable, short: t.activityAvailableShort, symbol: "◫" },
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
    // A driver who was resting/available and now switches to drive/work has just
    // ended their break. If that break already satisfied Article 4/7 (45 min, or
    // 15+30 split), the continuous-driving clock resets — otherwise it keeps
    // accumulating across the "break" and the hero card would stay stuck on
    // "exceeded" forever even after a valid rest.
    const endingQualifyingBreak = activity === "rest" && next !== "rest" && ruleResults.breakQualified;
    setActivity(next);
    setDemoMode(false);
    if (next !== "rest") {
      setRestElapsed(0);
      if (endingQualifyingBreak) setContinuousDrive(0);
    }
    setEvents((current) => [
      { id: `${Date.now()}-${next}`, activity: next, startedAt: new Date().toISOString(), source: "manual" },
      ...current.filter((entry) => entry.source === "manual"),
    ].slice(0, 40));
    setNotice(
      endingQualifyingBreak
        ? `${t.modeChanged}: ${activityMeta[next].label}. ${t.continuousReset}. ${t.officialSource}.`
        : `${t.modeChanged}: ${activityMeta[next].label}. ${t.officialSource}.`
    );
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
    let failureStage: "connection" | "flow-control" | "application-probe" | "diagnostic-session" | "remote-hmi" | "driver-card-read" = "connection";
    try {
      setFlowControlState("idle");
      setDiagnosticsFifoIndications(false);
      setDiagnosticsCreditsIndications(false);
      setClientCreditsGranted(0);
      setServerCreditsReceived([]);
      setCreditWriteCapabilities({ write: false, writeWithoutResponse: false });
      setCreditWriteAttempts([]);
      setCreditWriteMethod("not-used");
      setFlowControlError({ name: "none", message: "none" });
      setApplicationProbeState("idle");
      setFifoWriteCapabilities({ write: false, writeWithoutResponse: false });
      setFifoWriteAttempts([]);
      setFifoWriteMethod("not-used");
      setApplicationProbeResponse({ packetHeaderValid: false, responseType: "none", responseService: null, negativeResponseCode: null });
      setApplicationProbeError({ name: "none", message: "none" });
      setDiagnosticSessionState("idle");
      setDiagnosticSessionResponse({ packetHeaderValid: false, responseType: "none", responseService: null, responseSubFunction: null, negativeResponseCode: null });
      setDiagnosticSessionError({ name: "none", message: "none" });
      setDiagnosticSessionObservations([]);
      setRemoteHmiState("idle");
      setRemoteHmiStartResponse("none");
      setRemoteHmiStatusCode(null);
      setRemoteHmiPollCount(0);
      setRemoteHmiRecoveryStatusQueried(false);
      setRemoteHmiError({ name: "none", message: "none" });
      setDriverCardReadResults([]);
      setDriverCardReadAttempted(false);
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
      failureStage = "flow-control";
      if (transport.transportReady) {
        setFlowControlState("arming");
        const fifo = diagnosticsCharacteristics.find((characteristic) => characteristic.uuid.toLowerCase() === TACHO_DIAGNOSTICS_FIFO_UUID);
        const credits = diagnosticsCharacteristics.find((characteristic) => characteristic.uuid.toLowerCase() === TACHO_DIAGNOSTICS_CREDITS_UUID);
        if (!fifo || !credits) throw new Error("Diagnostics characteristics unavailable");

        let resolveServerCredit: ((value: number) => void) | null = null;
        let fifoPacketHandler: ((value: number[]) => boolean) | null = null;
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
        fifo.addEventListener("characteristicvaluechanged", (event) => {
          const characteristic = event.target as BleGattCharacteristic | null;
          const view = characteristic?.value;
          if (!view?.byteLength || !fifoPacketHandler) return;
          const bytes = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
          if (fifoPacketHandler(bytes)) fifoPacketHandler = null;
        });

        await credits.startNotifications();
        setDiagnosticsCreditsIndications(true);
        await fifo.startNotifications();
        setDiagnosticsFifoIndications(true);
        addBleTestEvent("indications-enabled");
        setFlowControlState("waiting");
        const capabilities = {
          write: Boolean(credits.properties?.write),
          writeWithoutResponse: Boolean(credits.properties?.writeWithoutResponse),
        };
        setCreditWriteCapabilities(capabilities);
        const creditValue = Uint8Array.of(1);
        const attempts: string[] = [];
        let usedMethod = "not-used";
        let firstError: unknown = null;

        if (capabilities.write && credits.writeValueWithResponse) {
          attempts.push("with-response");
          setCreditWriteAttempts([...attempts]);
          try {
            await credits.writeValueWithResponse(creditValue);
            usedMethod = "with-response";
          } catch (error) {
            firstError = error;
          }
        }
        if (usedMethod === "not-used" && capabilities.writeWithoutResponse && credits.writeValueWithoutResponse) {
          if (firstError) addBleTestEvent("client-credit-write-fallback");
          attempts.push("without-response");
          setCreditWriteAttempts([...attempts]);
          await credits.writeValueWithoutResponse(creditValue);
          usedMethod = "without-response";
        }
        if (usedMethod === "not-used" && !firstError && credits.writeValue) {
          attempts.push("legacy-auto");
          setCreditWriteAttempts([...attempts]);
          await credits.writeValue(creditValue);
          usedMethod = "legacy-auto";
        }
        if (usedMethod === "not-used") throw firstError ?? new DOMException("Credit characteristic does not expose a supported write method", "NotSupportedError");
        setCreditWriteMethod(usedMethod);
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
          failureStage = "application-probe";
          setApplicationProbeState("waiting");
          const responsePacket = new Promise<number[]>((resolve) => {
            fifoPacketHandler = (value) => { resolve(value); return true; };
          });
          const fifoCapabilities = {
            write: Boolean(fifo.properties?.write),
            writeWithoutResponse: Boolean(fifo.properties?.writeWithoutResponse),
          };
          setFifoWriteCapabilities(fifoCapabilities);
          const testerPresentPacket = Uint8Array.of(1, 1, 0x3e, 0x00);
          const fifoAttempts: string[] = [];
          let fifoMethod = "not-used";
          let fifoFirstError: unknown = null;

          if (fifoCapabilities.write && fifo.writeValueWithResponse) {
            fifoAttempts.push("with-response");
            setFifoWriteAttempts([...fifoAttempts]);
            try {
              await fifo.writeValueWithResponse(testerPresentPacket);
