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
      setNotice(t.errNoBluetooth);
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
        setNotice(t.errBleDisconnected);
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
          setNotice(t.bleCreditTimeout);
        } else if (received === 0xff) {
          setNotice(t.bleTransportRejected);
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
              fifoMethod = "with-response";
            } catch (error) {
              fifoFirstError = error;
            }
          }
          if (fifoMethod === "not-used" && fifoCapabilities.writeWithoutResponse && fifo.writeValueWithoutResponse) {
            if (fifoFirstError) addBleTestEvent("tester-present-write-fallback");
            fifoAttempts.push("without-response");
            setFifoWriteAttempts([...fifoAttempts]);
            await fifo.writeValueWithoutResponse(testerPresentPacket);
            fifoMethod = "without-response";
          }
          if (fifoMethod === "not-used" && !fifoFirstError && fifo.writeValue) {
            fifoAttempts.push("legacy-auto");
            setFifoWriteAttempts([...fifoAttempts]);
            await fifo.writeValue(testerPresentPacket);
            fifoMethod = "legacy-auto";
          }
          if (fifoMethod === "not-used") throw fifoFirstError ?? new DOMException("Diagnostics FIFO does not expose a supported write method", "NotSupportedError");
          setFifoWriteMethod(fifoMethod);
          addBleTestEvent("tester-present-sent");

          const packet = await Promise.race<number[] | null>([
            responsePacket,
            new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 6000)),
          ]);
          if (!packet) {
            addBleTestEvent("tester-present-timeout");
            setApplicationProbeState("timeout");
            setNotice(t.bleTesterPresentTimeout);
          } else {
            addBleTestEvent("tester-present-response");
            const packetHeaderValid = packet[0] === 1 && packet[1] === 1;
            const responseService = packet[2] ?? null;
            const positive = packetHeaderValid && responseService === 0x7e && packet[3] === 0x00;
            const negative = packetHeaderValid && responseService === 0x7f && packet[3] === 0x3e;
            const responseType = positive ? "positive" : negative ? "negative" : "unexpected";
            const negativeResponseCode = negative ? packet[4] ?? null : null;
            setApplicationProbeResponse({ packetHeaderValid, responseType, responseService, negativeResponseCode });
            setApplicationProbeState(responseType);
            setNotice(positive
              ? t.bleUdsSuccess
              : negative
                ? `${t.bleUdsRejected} ${negativeResponseCode ?? "?"}.`
                : t.bleUdsUnexpected);

            if (positive) {
              const observePacket = (packet: number[]): FifoPacketObservation => {
                const packetHeaderValid = packet[0] === 1 && packet[1] === 1;
                const responseService = packet[2] ?? null;
                const negative = packetHeaderValid && responseService === 0x7f;
                return {
                  byteLength: packet.length,
                  packetHeaderValid,
                  responseService,
                  requestService: negative ? packet[3] ?? null : null,
                  negativeResponseCode: negative ? packet[4] ?? null : null,
                };
              };
              const exchangeUds = async (payload: number[], sentEvent: BleTestEvent["event"], observedEvent: BleTestEvent["event"], accepts: (packet: number[]) => boolean) => {
                let handler: ((value: number[]) => boolean) | null = null;
                const observations: FifoPacketObservation[] = [];
                const response = new Promise<number[]>((resolve) => {
                  handler = (value) => {
                    observations.push(observePacket(value));
                    addBleTestEvent(observedEvent);
                    if (!accepts(value)) return false;
                    resolve(value);
                    return true;
                  };
                  fifoPacketHandler = handler;
                });
                await writeGattByMethod(credits, usedMethod, Uint8Array.of(1));
                setClientCreditsGranted((current) => current + 1);
                await writeGattByMethod(fifo, fifoMethod, Uint8Array.of(1, 1, ...payload));
                addBleTestEvent(sentEvent);
                const result = await Promise.race<number[] | null>([
                  response,
                  new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10000)),
                ]);
                if (fifoPacketHandler === handler) fifoPacketHandler = null;
                return { response: result, observations };
              };

              failureStage = "diagnostic-session";
              setDiagnosticSessionState("waiting");
              const sessionExchange = await exchangeUds(
                [0x10, 0x7e],
                "diagnostic-session-sent",
                "diagnostic-session-packet-observed",
                (packet) => packet[0] === 1 && packet[1] === 1 && ((packet[2] === 0x50 && packet[3] === 0x7e) || (packet[2] === 0x7f && packet[3] === 0x10)),
              );
              setDiagnosticSessionObservations(sessionExchange.observations);
              const sessionResponse = sessionExchange.response;
              if (!sessionResponse) {
                setDiagnosticSessionState("timeout");
                addBleTestEvent("diagnostic-session-timeout");
                setNotice(t.bleSessionTimeout);
                return;
              }
              const sessionHeaderValid = sessionResponse[0] === 1 && sessionResponse[1] === 1;
              const sessionPositive = sessionHeaderValid && sessionResponse[2] === 0x50 && sessionResponse[3] === 0x7e;
              const sessionNegative = sessionHeaderValid && sessionResponse[2] === 0x7f && sessionResponse[3] === 0x10;
              setDiagnosticSessionResponse({
                packetHeaderValid: sessionHeaderValid,
                responseType: sessionPositive ? "positive" : sessionNegative ? "negative" : "unexpected",
                responseService: sessionResponse[2] ?? null,
                responseSubFunction: sessionPositive ? sessionResponse[3] ?? null : null,
                negativeResponseCode: sessionNegative ? sessionResponse[4] ?? null : null,
              });
              setDiagnosticSessionState(sessionPositive ? "positive" : sessionNegative ? "negative" : "unexpected");
              addBleTestEvent(sessionPositive ? "diagnostic-session-positive" : sessionNegative ? "diagnostic-session-negative" : "diagnostic-session-negative");
              if (!sessionPositive) {
                setNotice(sessionNegative
                  ? `${t.bleSessionRejected} ${sessionResponse[4] ?? "?"}.`
                  : t.bleSessionUnexpected);
                return;
              }

              failureStage = "driver-card-read";
              const definitions = [
                { did: 0xf903, name: "driver-working-state", unit: "state" as const },
              ];
              const readResults: DriverCardReadResult[] = [];
              for (const definition of definitions) {
                const didHigh = (definition.did >> 8) & 0xff;
                const didLow = definition.did & 0xff;
                const did = definition.did.toString(16).toUpperCase().padStart(4, "0");
                setDriverCardReadAttempted(true);
                const exchange = await exchangeUds(
                  [0x22, didHigh, didLow],
                  "driver-card-read-sent",
                  "driver-card-read-packet-observed",
                  (packet) => packet[0] === 1 && packet[1] === 1 && ((packet[2] === 0x62 && packet[3] === didHigh && packet[4] === didLow) || (packet[2] === 0x7f && packet[3] === 0x22)),
                );
                const response = exchange.response;
                if (!response) {
                  addBleTestEvent("driver-card-read-timeout");
                  readResults.push({ did, name: definition.name, status: "timeout", value: null, unit: definition.unit, activity: null, negativeResponseCode: null, observations: exchange.observations });
                  if (readResults.length === 1) break;
                  continue;
                }
                const headerValid = response[0] === 1 && response[1] === 1;
                const positiveRead = headerValid && response[2] === 0x62 && response[3] === didHigh && response[4] === didLow;
                const negativeRead = headerValid && response[2] === 0x7f && response[3] === 0x22;
                if (positiveRead) {
                  const rawValue = definition.unit === "state"
                    ? response[5] ?? 0xff
                    : (response[5] ?? 0xff) | ((response[6] ?? 0xff) << 8);
                  const unavailable = definition.unit === "state" ? rawValue === 0xff : rawValue >= 0xff00;
                  const stateCode = definition.unit === "state" ? rawValue & 0x07 : null;
                  const activityValue = stateCode === 0 ? "rest" : stateCode === 1 ? "available" : stateCode === 2 ? "work" : stateCode === 3 ? "drive" : "unknown";
                  readResults.push({
                    did,
                    name: definition.name,
                    status: "positive",
                    value: unavailable ? null : rawValue,
                    unit: definition.unit,
                    activity: definition.unit === "state" ? activityValue : null,
                    negativeResponseCode: null,
                    observations: exchange.observations,
                  });
                  addBleTestEvent("driver-card-read-positive");
                } else if (negativeRead) {
                  readResults.push({ did, name: definition.name, status: "negative", value: null, unit: definition.unit, activity: null, negativeResponseCode: response[4] ?? null, observations: exchange.observations });
                  addBleTestEvent("driver-card-read-negative");
                } else {
                  readResults.push({ did, name: definition.name, status: "unexpected", value: null, unit: definition.unit, activity: null, negativeResponseCode: null, observations: exchange.observations });
                }
              }
              setDriverCardReadResults(readResults);
              const positiveReads = readResults.filter((entry) => entry.status === "positive").length;
              setNotice(positiveReads > 0
                ? t.bleCardReadSuccess
                : t.bleCardReadMissing);
            }
          }
        }
      } else {
        setNotice(classification.hasStandardTachoService ? t.protocolServiceDetected : t.protocolServiceMissing);
      }
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === "NotFoundError";
      const flowControlFailure = !cancelled && linkEstablished;
      const safeError = {
        name: error instanceof DOMException || error instanceof Error ? error.name : "UnknownError",
        message: error instanceof DOMException || error instanceof Error ? error.message.slice(0, 180) : "Unknown BLE write error",
      };
      if (failureStage === "remote-hmi") {
        setRemoteHmiError(safeError);
        setRemoteHmiState("error");
        addBleTestEvent("rhmi-error");
        setDeviceState("linked");
        setNotice(`${t.bleRhmiError} (${safeError.name})`);
        return;
      }
      if (failureStage === "diagnostic-session") {
        setDiagnosticSessionError(safeError);
        setDiagnosticSessionState("error");
        setDeviceState("linked");
        setNotice(`${t.bleDiagSessionError} (${safeError.name})`);
        return;
      }
      if (failureStage === "application-probe") {
        setApplicationProbeError(safeError);
        setApplicationProbeState("error");
        addBleTestEvent("application-probe-error");
        setDeviceState("linked");
        setNotice(`${t.bleAppProbeError} (${safeError.name})`);
        return;
      }
      if (failureStage === "driver-card-read") {
        setDeviceState("linked");
        setNotice(`${t.bleCardReadError} (${safeError.name})`);
        return;
      }
      if (flowControlFailure) {
        setFlowControlError({
          name: safeError.name,
          message: safeError.message,
        });
      }
      addBleTestEvent(cancelled ? "cancelled" : flowControlFailure ? "flow-control-error" : "connection-error");
      if (flowControlFailure) setFlowControlState("error");
      setDeviceState(cancelled ? "idle" : flowControlFailure ? "linked" : "error");
      setNotice(cancelled ? t.bleDeviceCancelled : flowControlFailure ? t.bleHandshakeFailed : t.bleConnectionFailed);
    }
  };

  const copyCompatibilityReport = async () => {
    const firstEventAt = bleTestEvents[0]?.at;
    const report = buildCompatibilityReport({
      createdAt: new Date().toISOString(),
      appVersion: "0.15-remote-session-f903",
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
        creditWriteCapabilities,
        creditWriteAttempts,
        creditWriteMethod,
        errorName: flowControlError.name,
        errorMessage: flowControlError.message,
      },
      applicationProbe: {
        attempted: applicationProbeState !== "idle",
        status: applicationProbeState,
        fifoWriteCapabilities,
        fifoWriteAttempts,
        fifoWriteMethod,
        ...applicationProbeResponse,
        errorName: applicationProbeError.name,
        errorMessage: applicationProbeError.message,
      },
      diagnosticSession: {
        attempted: diagnosticSessionState !== "idle",
        status: diagnosticSessionState,
        ...diagnosticSessionResponse,
        errorName: diagnosticSessionError.name,
        errorMessage: diagnosticSessionError.message,
        observations: diagnosticSessionObservations,
      },
      remoteHmi: {
        attempted: remoteHmiState !== "idle",
        state: remoteHmiState,
        startResponse: remoteHmiStartResponse,
        statusCode: remoteHmiStatusCode,
        pollCount: remoteHmiPollCount,
        recoveryStatusQueried: remoteHmiRecoveryStatusQueried,
        errorName: remoteHmiError.name,
        errorMessage: remoteHmiError.message,
      },
      driverCardRead: {
        attempted: driverCardReadAttempted,
        results: driverCardReadResults,
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
    setDeviceState("idle");
    setNotice(t.bleDisconnectedSafely);
  };

  const installApp = async () => {
    if (!installPrompt) {
      setNotice(t.msgInstallPrompt);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setInstalled(true);
    setNotice(choice.outcome === "accepted" ? t.msgInstalled : t.msgInstallCancelled);
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
    setNotice(t.msgManualSaved);
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
              setNotice(t.msgDemoNote);
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
              <button type="button" onClick={() => setNotice(t.msgDisclaimer)}>{t.why}</button>
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
                <h3>{deviceState === "linked" ? device?.name || t.statusLinked : t.notConnected}</h3>
                <p>{deviceState === "linked" ? t.devSubtitle : t.statusUnknown}</p>
              </div>
            </div>
            <button type="button" className="primary-button" onClick={() => { setSelectedTab("device"); setNotice(t.msgCompatCenterOpened); }}>
              {t.checkDevice} <span>→</span>
            </button>
          </section>

          <aside className="legal-note">
            <span>!</span>
            <p><strong>Važno:</strong> TachoCommand je pomocný nástroj. Tachograf, karta řidiče a předpisy zůstávají vždy merodavné.</p>
          </aside>
        </div>

        {selectedTab === "log" && (
          <section className="module-screen" aria-labelledby="log-title">
            <div className="module-heading">
              <div>
                <p className="section-kicker">{t.logLocalLog}</p>
                <h2 id="log-title">{t.logTitle}</h2>
                <p>{t.logSubtitle}</p>
              </div>
              <span className={`network-badge ${online ? "online" : "offline"}`}>{online ? "ONLINE" : "OFFLINE"}</span>
            </div>

            <div className="summary-grid">
              <div><span>{t.logTodayDrive}</span><strong>{formatClock(dailyDrive)}</strong></div>
              <div><span>{t.logActiveShift}</span><strong>{formatClock(shiftElapsed)}</strong></div>
            </div>

            <div className="timeline-card">
              {events.length === 0 ? (
                <div className="empty-state"><strong>{t.logEmptyTitle}</strong><span>{t.logEmptyDesc}</span></div>
              ) : events.map((entry, index) => (
                <div className="timeline-entry" key={entry.id}>
                  <div className={`timeline-dot ${entry.activity}`}><span>{activityMeta[entry.activity].symbol}</span></div>
                  <div>
                    <strong>{activityMeta[entry.activity].label}</strong>
                    <span>{new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : locale === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(entry.startedAt))}</span>
                  </div>
                  <em>{entry.source === "demo" ? t.logDemo : index === 0 ? t.logNow : t.logManual}</em>
                </div>
              ))}
            </div>

            <aside className="legal-note"><span>i</span><p>{t.logNote}</p></aside>
          </section>
        )}

        {selectedTab === "device" && (
          <section className="module-screen" aria-labelledby="device-title">
            <div className="module-heading">
              <div>
                <p className="section-kicker">{t.devCompatCenter}</p>
                <h2 id="device-title">{t.devTitle}</h2>
                <p>{t.devSubtitle}</p>
              </div>
              <span className={`device-orb ${deviceState}`} aria-hidden="true">⌁</span>
            </div>

            <div className="field-profile-card">
              <div>
                <p className="section-kicker">{t.devProfileKicker}</p>
                <h3>{t.devProfileTitle}</h3>
                <p>{t.devProfileDesc}</p>
              </div>
              <div className="field-profile-grid">
                <label>{t.devVehicle}
                  <select value={fieldTestProfile.vehicleType} onChange={(event) => setFieldTestProfile((current) => ({ ...current, vehicleType: event.target.value as FieldTestProfile["vehicleType"] }))}>
                    <option value="bus">{t.devBus}</option>
                    <option value="truck">{t.devTruck}</option>
                    <option value="other">{t.devOther}</option>
                  </select>
                </label>
                <label>{t.devTacho}
                  <select value={fieldTestProfile.tachoBrand} onChange={(event) => setFieldTestProfile((current) => ({ ...current, tachoBrand: event.target.value as FieldTestProfile["tachoBrand"] }))}>
                    <option value="vdo">VDO / DTCO</option>
                    <option value="stoneridge">Stoneridge</option>
                    <option value="other">{t.devOther}</option>
                  </select>
                </label>
                <label className="field-profile-model">{t.devModel}
                  <input value={fieldTestProfile.tachoModel} onChange={(event) => setFieldTestProfile((current) => ({ ...current, tachoModel: event.target.value.slice(0, 60) }))} placeholder={t.devModelPlaceholder} />
                </label>
              </div>
            </div>

            <div className="device-status-card">
              <div className="status-line">
                <span className={`status-light ${deviceState}`} />
                <div>
                  <strong>{
                    deviceState === "linked" ? t.statusLinked :
                    deviceState === "connecting" ? t.statusWaiting :
                    deviceState === "unsupported" ? t.statusUnsupported :
                    deviceState === "error" ? t.statusFailed : t.statusReady
                  }</strong>
                  <span>{deviceState === "linked" ? device?.name || t.statusDevice : t.statusUnknown}</span>
                </div>
              </div>
              {deviceState === "linked" ? (
                <button className="secondary-button danger" type="button" onClick={disconnectBluetooth}>{t.actionDisconnect}</button>
              ) : (
                <button className="primary-button" type="button" onClick={connectBluetooth} disabled={deviceState === "connecting"}>
                  {deviceState === "connecting" ? t.actionConnecting : t.actionConnect} <span>→</span>
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
                <div><span>{t.statAttempts}</span><strong>{bleTestEvents.filter((entry) => entry.event === "connection-attempt").length}</strong></div>
                <div><span>{t.statDrops}</span><strong>{bleTestEvents.filter((entry) => entry.event === "disconnected").length}</strong></div>
                <div><span>{t.statService}</span><strong>{protocolServiceDetected === true ? t.statYes : protocolServiceDetected === false ? t.statNo : "—"}</strong></div>
                <div><span>{t.statTransport}</span><strong>{transportReady === true ? "4/4" : transportReady === false ? t.statNo : "—"}</strong></div>
                <div><span>{t.statHandshake}</span><strong>{flowControlState === "ready" ? t.statYes : flowControlState === "rejected" ? t.statRejected : flowControlState === "error" || flowControlState === "timeout" ? t.statNo : flowControlState === "idle" ? "—" : "…"}</strong></div>
                <div><span>{t.statUds}</span><strong>{applicationProbeState === "positive" ? t.statYes : applicationProbeState === "negative" ? t.statRejected : applicationProbeState === "timeout" || applicationProbeState === "error" || applicationProbeState === "unexpected" ? t.statNo : applicationProbeState === "idle" ? "—" : "…"}</strong></div>
                <div><span>{t.statCard}</span><strong>{driverCardReadResults.some((entry) => entry.status === "positive") ? t.statYes : driverCardReadResults.length > 0 ? t.statNo : "—"}</strong></div>
              </div>
            )}

            <div className="truth-card">
              <p className="section-kicker">{t.chkWhatConfirmed}</p>
              <ul>
                <li className="pass"><span>✓</span><div><strong>{t.chkBleTitle}</strong><small>{t.chkBleDesc}</small></div></li>
                <li className="pass"><span>✓</span><div><strong>{t.chkConsentTitle}</strong><small>{t.chkConsentDesc}</small></div></li>
                <li className={protocolServiceDetected === true ? "pass" : "pending"}>
                  <span>{protocolServiceDetected === true ? "✓" : "…"}</span>
                  <div>
                    <strong>{t.chkServiceTitle}</strong>
                    <small>{protocolServiceDetected === true
                      ? t.protocolServiceDetected
                      : protocolServiceDetected === false
                        ? t.protocolServiceMissing
                        : t.chkServicePending}</small>
                  </div>
                </li>
                <li className={transportReady === true ? "pass" : "pending"}>
                  <span>{transportReady === true ? "✓" : "…"}</span>
                  <div>
                    <strong>{t.chkTransportTitle}</strong>
                    <small>{transportReady === true
                      ? t.chkTransportPass
                      : transportReady === false
                        ? t.chkTransportFail
                        : t.chkTransportPending}</small>
                  </div>
                </li>
                <li className={flowControlState === "ready" ? "pass" : flowControlState === "rejected" || flowControlState === "error" || flowControlState === "timeout" ? "blocked" : "pending"}>
                  <span>{flowControlState === "ready" ? "✓" : flowControlState === "rejected" || flowControlState === "error" || flowControlState === "timeout" ? "×" : "…"}</span>
                  <div>
                    <strong>{t.chkHandshakeTitle}</strong>
                    <small>{flowControlState === "ready"
                      ? `${t.chkHandshakePass} (${serverCreditsReceived.at(-1)}).`
                      : flowControlState === "rejected"
                        ? t.chkHandshakeRej
                        : flowControlState === "timeout"
                          ? t.chkHandshakeTime
                      : flowControlState === "error"
                            ? t.chkHandshakeErr
                            : flowControlState === "arming" || flowControlState === "waiting"
                              ? t.chkHandshakeWait
                              : t.chkHandshakePending}</small>
                  </div>
                </li>
                <li className={applicationProbeState === "positive" ? "pass" : applicationProbeState === "negative" || applicationProbeState === "unexpected" || applicationProbeState === "timeout" || applicationProbeState === "error" ? "blocked" : "pending"}>
                  <span>{applicationProbeState === "positive" ? "✓" : applicationProbeState === "negative" || applicationProbeState === "unexpected" || applicationProbeState === "timeout" || applicationProbeState === "error" ? "×" : "…"}</span>
                  <div>
                    <strong>{t.chkUdsTitle}</strong>
                    <small>{applicationProbeState === "positive"
                      ? t.chkUdsPass
                      : applicationProbeState === "negative"
                        ? `${t.chkUdsRej} ${applicationProbeResponse.negativeResponseCode === null ? "" : ` (${applicationProbeResponse.negativeResponseCode})`}.`
                        : applicationProbeState === "timeout"
                          ? t.chkUdsTime
                          : applicationProbeState === "unexpected"
                            ? t.chkUdsUnexp
                            : applicationProbeState === "error"
                              ? t.chkUdsErr
                              : applicationProbeState === "waiting"
                                ? t.chkUdsWait
                                : t.chkUdsPending}</small>
                  </div>
                </li>
                <li className={diagnosticSessionState === "positive" ? "pass" : diagnosticSessionState === "idle" || diagnosticSessionState === "waiting" ? "pending" : "blocked"}>
                  <span>{diagnosticSessionState === "positive" ? "✓" : diagnosticSessionState === "idle" || diagnosticSessionState === "waiting" ? "…" : "×"}</span>
                  <div>
                    <strong>{t.chkSessionTitle}</strong>
                    <small>{diagnosticSessionState === "positive"
                      ? t.chkSessionPass
                      : diagnosticSessionState === "timeout"
                        ? t.chkSessionTime
                      : diagnosticSessionState === "negative"
                          ? `${t.chkSessionRej} ${diagnosticSessionResponse.negativeResponseCode === null ? "" : ` (${diagnosticSessionResponse.negativeResponseCode})`}.`
                          : diagnosticSessionState === "error" || diagnosticSessionState === "unexpected"
                            ? t.chkSessionErr
                            : t.chkSessionPending}</small>
                  </div>
                </li>
                <li className={driverCardReadResults.some((entry) => entry.status === "positive") ? "pass" : driverCardReadResults.length > 0 ? "blocked" : "pending"}>
                  <span>{driverCardReadResults.some((entry) => entry.status === "positive") ? "✓" : driverCardReadResults.length > 0 ? "×" : "…"}</span>
                  <div>
                    <strong>{t.chkCardTitle}</strong>
                    <small>{driverCardReadResults.some((entry) => entry.status === "positive")
                      ? t.chkCardPass
                      : driverCardReadResults.length > 0
                        ? t.chkCardFail
                        : t.chkCardPending}</small>
                  </div>
                </li>
                <li className="blocked"><span>×</span><div><strong>{t.chkFakeTitle}</strong><small>{t.chkFakeDesc}</small></div></li>
              </ul>
            </div>

            <div className="steps-card">
              <p className="section-kicker">{t.stepsKicker}</p>
              <ol>
                <li><span>1</span>{t.step1}</li>
                <li><span>2</span>{t.step2}</li>
                <li><span>3</span>{t.step3}</li>
                <li><span>4</span>{t.step4}</li>
              </ol>
            </div>
          </section>
        )}

        {selectedTab === "more" && (
          <section className="module-screen" aria-labelledby="more-title">
            <div className="module-heading">
              <div>
                <p className="section-kicker">{t.setKicker}</p>
                <h2 id="more-title">{t.yourTachoCommand}</h2>
                <p>{t.fastLocalTransparent}</p>
              </div>
              <div className="app-mini-mark">TC</div>
            </div>

            <div className="settings-list">
              {installed ? (
                <div className="installed-setting"><span className="setting-icon">✓</span><div><strong>{t.setAppInstalled}</strong><small>{t.setAppInstalledDesc}</small></div><em className="good">●</em></div>
              ) : (
                <button type="button" onClick={installApp}><span className="setting-icon">⇩</span><div><strong>{t.setInstallApp}</strong><small>{t.setInstallAppDesc}</small></div><em>›</em></button>
              )}
              <button type="button" onClick={() => setShowTimeEditor(true)}><span className="setting-icon">◷</span><div><strong>{t.setManualTime}</strong><small>{t.setManualTimeDesc}</small></div><em>›</em></button>
              <button type="button" onClick={() => setNotice(online ? t.msgNetworkOnline : t.msgNetworkOffline)}><span className="setting-icon">◎</span><div><strong>{t.setOfflineStat}</strong><small>{online ? t.setOfflineOn : t.setOfflineOff}</small></div><em className={online ? "good" : "warn"}>●</em></button>
              <label className="language-setting">
                <span className="setting-icon">文</span>
                <div><strong>{t.language}</strong><small>{t.languageHint}</small></div>
                <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t.language}>
                  <option value="cs">{t.languageCs}</option>
                  <option value="en">{t.languageEn}</option>
                  <option value="de">{t.languageDe}</option>
                </select>
              </label>
            </div>

            <div className="ad-boundary-card">
              <span>{t.adKicker}</span>
              <strong>{t.adTitle}</strong>
              <p>{t.adDesc}</p>
            </div>

            <div className="about-card">
              <div><span>{t.version}</span><strong>0.16 Remote Session F903</strong></div>
              <div><span>{t.aboutSource}</span><strong>{demoMode ? t.sourceDemo : t.aboutManual}</strong></div>
              <div><span>{t.aboutCloud}</span><strong>{t.aboutCloudDesc}</strong></div>
            </div>

            <div className="source-card">
              <p className="section-kicker">{t.provSources}</p>
              <a href="https://eur-lex.europa.eu/eli/reg_impl/2021/1228/oj/eng" target="_blank" rel="noreferrer">EU 2021/1228 — Smart Tacho 2 i ITS/BLE <span>↗</span></a>
              <a href="https://developer.chrome.com/docs/capabilities/bluetooth" target="_blank" rel="noreferrer">Chrome — Web Bluetooth <span>↗</span></a>
              <a href="https://www.fleet.vdo.com/support/faq/" target="_blank" rel="noreferrer">VDO — DTCO 4.1 Bluetooth <span>↗</span></a>
              <a href="https://stoneridge-tachographs.com/en/products/se5000-smart-2" target="_blank" rel="noreferrer">Stoneridge — SE5000 Smart 2 <span>↗</span></a>
            </div>
          </section>
        )}

        {showTimeEditor && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowTimeEditor(false); }}>
            <form className="editor-modal" onSubmit={saveManualTimes} aria-labelledby="editor-title">
              <div className="modal-heading">
                <div><p className="section-kicker">{t.modManualSrc}</p><h2 id="editor-title">{t.modTitle}</h2></div>
                <button type="button" aria-label="Zatvori" onClick={() => setShowTimeEditor(false)}>×</button>
              </div>
              <p className="modal-explainer">{t.modDesc}</p>
              {([
                ["continuous", t.modContinuous, continuousDrive],
                ["daily", t.modDaily, dailyDrive],
                ["shift", t.modShift, shiftElapsed],
              ] as [string, string, number][]).map(([key, label, value]) => (
                <fieldset key={key}>
                  <legend>{label}</legend>
                  <label><input name={`${key}Hours`} type="number" inputMode="numeric" min="0" max="99" defaultValue={Math.floor(value / HOUR)} /><span>{t.modHours}</span></label>
                  <b>:</b>
                  <label><input name={`${key}Minutes`} type="number" inputMode="numeric" min="0" max="59" defaultValue={Math.floor((value % HOUR) / MINUTE)} /><span>{t.modMins}</span></label>
                </fieldset>
              ))}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowTimeEditor(false)}>{t.modCancel}</button>
                <button type="submit" className="primary-button">{t.modSave}</button>
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
