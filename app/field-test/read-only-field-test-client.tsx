"use client";

import { useRef, useState } from "react";
import {
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import { readCoreDriverTelemetry } from "../../lib/tacho-live.js";
import { createUdsResponseCollector } from "../../lib/tacho-uds.js";

type BleCharacteristic = {
  uuid: string;
  value?: DataView | null;
  properties?: { write?: boolean; writeWithoutResponse?: boolean };
  startNotifications: () => Promise<BleCharacteristic>;
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValue?: (value: BufferSource) => Promise<void>;
  addEventListener: (type: "characteristicvaluechanged", listener: (event: Event) => void) => void;
};

type BleService = { uuid: string; getCharacteristics: () => Promise<BleCharacteristic[]> };
type BleServer = { getPrimaryServices: () => Promise<BleService[]> };
type BleDevice = { name?: string; gatt?: { connect: () => Promise<BleServer> } };
type LogEntry = { time: string; level: "info" | "pass" | "warn" | "fail"; message: string };
type UdsResult = { status: string; reason: string | null; response: readonly number[] | null };
type UdsCollector = { push: (packet: number[]) => UdsResult };

type PendingRequest = {
  collector: UdsCollector;
  resolve: (response: number[] | null) => void;
  reject: (error: Error) => void;
};

const APP_VERSION = "0.31-core-rdbi-field-candidate";
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const writeGatt = async (char: BleCharacteristic, bytes: number[]) => {
  const value = Uint8Array.from(bytes);
  if (char.properties?.write && char.writeValueWithResponse) return char.writeValueWithResponse(value);
  if (char.properties?.writeWithoutResponse && char.writeValueWithoutResponse) return char.writeValueWithoutResponse(value);
  if (char.writeValue) return char.writeValue(value);
  if (char.writeValueWithResponse) return char.writeValueWithResponse(value);
  if (char.writeValueWithoutResponse) return char.writeValueWithoutResponse(value);
  throw new Error("Write metoda nije dostupna na karakteristici");
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
};

export default function ReadOnlyFieldTestClient() {
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [activity, setActivity] = useState("unknown");
  const [continuousDrivingSec, setContinuousDrivingSec] = useState<number | null>(null);
  const [breakSec, setBreakSec] = useState<number | null>(null);
  const [dailyDrivingSec, setDailyDrivingSec] = useState<number | null>(null);
  const [weeklyDrivingSec, setWeeklyDrivingSec] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const stopRef = useRef(false);
  const creditsRef = useRef<BleCharacteristic | null>(null);

  const addLog = (level: LogEntry["level"], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((previous) => [{ time, level, message }, ...previous.slice(0, 79)]);
  };

  const runTelemetry = async (
    sendUds: (payload: readonly number[], timeoutMs?: number) => Promise<number[] | null>,
  ) => {
    addLog("pass", "Read-only RDBI telemetrija pokrenuta bez RHMI/F211 sesije.");

    while (!stopRef.current) {
      try {
        const telemetry = await readCoreDriverTelemetry(sendUds, 2200);
        setActivity(telemetry.activity);
        setContinuousDrivingSec(telemetry.continuousDrivingSeconds);
        setBreakSec(telemetry.cumulativeBreakSeconds);
        setDailyDrivingSec(telemetry.dailyDrivingSeconds);
        setWeeklyDrivingSec(telemetry.weeklyDrivingSeconds);

        if (!telemetry.activityValid || telemetry.continuousDrivingSeconds === null || telemetry.cumulativeBreakSeconds === null) {
          addLog("warn", "Jedan ili više mandatory core DID-ova nisu potvrđeni u ovom ciklusu.");
        }
        if (!telemetry.capabilities.dailyDriving || !telemetry.capabilities.weeklyDriving) {
          addLog("info", "F99A/F99B nisu dostupni; optional telemetrija ostaje prazna.");
        }

        const testerPresent = await sendUds([0x3e, 0x00], 1200);
        if (!testerPresent || testerPresent[2] !== 0x7e) {
          addLog("warn", "TesterPresent nije potvrđen u ovom ciklusu.");
        }
      } catch (error) {
        addLog("warn", `Telemetrija: ${error instanceof Error ? error.message : String(error)}`);
      }

      await sleep(2000);
    }
  };

  const connectAndStart = async () => {
    setLogs([]);
    setRunning(true);
    stopRef.current = false;
    setActivity("unknown");
    setContinuousDrivingSec(null);
    setBreakSec(null);
    setDailyDrivingSec(null);
    setWeeklyDrivingSec(null);

    try {
      const bluetooth = (navigator as Navigator & {
        bluetooth?: {
          requestDevice: (options: {
            acceptAllDevices: boolean;
            optionalServices: readonly string[];
          }) => Promise<BleDevice>;
        };
      }).bluetooth;

      if (!bluetooth) throw new Error("Web Bluetooth nije podržan. Koristite Chrome na Android telefonu.");

      addLog("info", "Otvaram Bluetooth izbor uređaja...");
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS,
      });
      setDeviceName(device.name || "Tahograf");

      if (!device.gatt) throw new Error("GATT interfejs nije dostupan");
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const diagnostics = services.find(
        (service) => service.uuid.toLowerCase() === TACHO_DIAGNOSTICS_SERVICE_UUID.toLowerCase(),
      );
      if (!diagnostics) throw new Error("Smart Tacho Diagnostics servis nije pronađen");

      const characteristics = await diagnostics.getCharacteristics();
      const fifo = characteristics.find(
        (characteristic) => characteristic.uuid.toLowerCase() === TACHO_DIAGNOSTICS_FIFO_UUID.toLowerCase(),
      );
      const credits = characteristics.find(
        (characteristic) => characteristic.uuid.toLowerCase() === TACHO_DIAGNOSTICS_CREDITS_UUID.toLowerCase(),
      );
      if (!fifo || !credits) throw new Error("FIFO/Credits karakteristike nisu pronađene");
      creditsRef.current = credits;

      let pendingRequest: PendingRequest | null = null;
      let creditResolver: ((credit: number) => void) | null = null;

      fifo.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength) return;
        const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));

        // Jedan novi kredit za svaki primljeni ITS paket.
        writeGatt(credits, [1]).catch(() => {});

        if (!pendingRequest) return;
        const result = pendingRequest.collector.push(packet);
        if (result.status === "complete") {
          const request = pendingRequest;
          pendingRequest = null;
          request.resolve(Array.from(result.response ?? []));
        } else if (result.status === "invalid") {
          const request = pendingRequest;
          pendingRequest = null;
          request.reject(new Error(`ITS paket nije validan: ${result.reason ?? "unknown"}`));
        }
      });

      credits.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength || !creditResolver) return;
        const resolve = creditResolver;
        creditResolver = null;
        resolve(view.getUint8(0));
      });

      await credits.startNotifications();
      await fifo.startNotifications();

      const serverCreditPromise = new Promise<number>((resolve) => { creditResolver = resolve; });
      await writeGatt(credits, [1]);
      const serverCredit = await Promise.race([serverCreditPromise, sleep(4000).then(() => null)]);
      creditResolver = null;
      if (serverCredit === null) throw new Error("Server credit timeout");
      if (serverCredit === 0xff) throw new Error("Tahograf je odbio flow control");
      addLog("pass", `BLE FIFO/Credits spremni. Server credit: ${serverCredit}`);

      const sendUds = async (payload: readonly number[], timeoutMs = 4000): Promise<number[] | null> => {
        if (pendingRequest) throw new Error("Paralelni UDS zahtev nije dozvoljen");

        const collector = createUdsResponseCollector(payload) as UdsCollector;
        return new Promise<number[] | null>((resolve, reject) => {
          let completed = false;
          const finishResolve = (response: number[] | null) => {
            if (completed) return;
            completed = true;
            window.clearTimeout(timer);
            resolve(response);
          };
          const finishReject = (error: Error) => {
            if (completed) return;
            completed = true;
            window.clearTimeout(timer);
            reject(error);
          };
          const timer = window.setTimeout(() => {
            if (pendingRequest?.collector === collector) pendingRequest = null;
            finishResolve(null);
          }, timeoutMs);

          pendingRequest = { collector, resolve: finishResolve, reject: finishReject };
          writeGatt(fifo, [1, 1, ...payload]).catch((error) => {
            if (pendingRequest?.collector === collector) pendingRequest = null;
            finishReject(error instanceof Error ? error : new Error(String(error)));
          });
        });
      };

      // Zdravlje transporta proveravamo pre prvog read-only RDBI zahteva.
      const testerPresent = await sendUds([0x3e, 0x00]);
      if (!testerPresent || testerPresent[2] !== 0x7e) {
        throw new Error("TesterPresent nije dobio pozitivan odgovor");
      }

      setConnected(true);
      addLog("pass", "TesterPresent potvrđen. Krećem direktno na read-only 0x22 RDBI.");
      void runTelemetry(sendUds);
    } catch (error) {
      setConnected(false);
      addLog("fail", error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };

  const stopConnection = async () => {
    stopRef.current = true;
    setConnected(false);
    if (creditsRef.current) {
      try {
        await writeGatt(creditsRef.current, [0xff]);
      } catch {}
    }
    addLog("info", "Read-only sesija je zaustavljena.");
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>TachoCommand — Core Field Test</h1>
          <p style={{ margin: "4px 0", color: "#6b7280", fontSize: 13 }}>{APP_VERSION}</p>
        </div>
        {connected ? (
          <button type="button" onClick={stopConnection}>Prekini</button>
        ) : (
          <button type="button" onClick={connectAndStart} disabled={running}>
            {running ? "Povezujem…" : "Poveži tahograf"}
          </button>
        )}
      </div>

      <p style={{ padding: 12, background: "#f3f4f6", borderRadius: 10, fontSize: 13 }}>
        Ovaj kandidat koristi samo read-only RDBI za osnovne podatke. Ne otvara Remote HMI/F211 sesiju.
        F99A/F99B su opcioni i njihovo odsustvo nije greška.
      </p>

      <div style={{ marginBottom: 14, fontSize: 14 }}>Uređaj: <strong>{deviceName}</strong></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Trenutna aktivnost — F903</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{activity.toUpperCase()}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Neprekidna vožnja — F923</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatDuration(continuousDrivingSec)}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Kumulativna pauza — F925</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatDuration(breakSec)}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Dnevna vožnja — F99A (optional)</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatDuration(dailyDrivingSec)}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Nedeljna vožnja — F99B (optional)</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatDuration(weeklyDrivingSec)}</div>
        </article>
      </div>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16 }}>Dnevnik</h2>
        <div style={{ background: "#111827", color: "#e5e7eb", borderRadius: 10, padding: 12, minHeight: 180, fontFamily: "monospace", fontSize: 12 }}>
          {logs.length === 0 ? "Još nema događaja." : logs.map((entry, index) => (
            <div key={`${entry.time}-${index}`} style={{ marginBottom: 4 }}>
              [{entry.time}] {entry.level.toUpperCase()}: {entry.message}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
