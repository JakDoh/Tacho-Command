"use client";

import { useRef, useState } from "react";
import {
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import {
  classifyOpenRhmiPacket,
  describeRhmiStatus,
  parseDriverWorkingState,
} from "../../lib/tacho-rhmi.js";

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

const APP_VERSION = "0.30-smarttacho2-live-cockpit";
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function FieldTestClient() {
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [rhmiOpen, setRhmiOpen] = useState(false);
  const [waitingOkOnTacho, setWaitingOkOnTacho] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Live Cockpit Data
  const [activity, setActivity] = useState<"drive" | "work" | "available" | "rest" | "unknown">("unknown");
  const [continuousDrivingSec, setContinuousDrivingSec] = useState<number>(0);
  const [breakSec, setBreakSec] = useState<number>(0);
  const [dailyDrivingSec, setDailyDrivingSec] = useState<number>(0);
  const [liveStreamActive, setLiveStreamActive] = useState<boolean>(false);

  const fifoRef = useRef<BleCharacteristic | null>(null);
  const creditsRef = useRef<BleCharacteristic | null>(null);
  const stopLiveRef = useRef<boolean>(false);

  const addLog = (level: LogEntry["level"], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, level, message }, ...prev.slice(0, 100)]);
  };

  const writeGatt = async (char: BleCharacteristic, bytes: number[]) => {
    const value = Uint8Array.from(bytes);
    if (char.properties?.write && char.writeValueWithResponse) return char.writeValueWithResponse(value);
    if (char.properties?.writeWithoutResponse && char.writeValueWithoutResponse) return char.writeValueWithoutResponse(value);
    if (char.writeValue) return char.writeValue(value);
    if (char.writeValueWithResponse) return char.writeValueWithResponse(value);
    if (char.writeValueWithoutResponse) return char.writeValueWithoutResponse(value);
    throw new Error("Write metoda nije dostupna na karakteristici");
  };

  // Glavno pokretanje testa i povezivanja
  const connectAndStart = async () => {
    setLogs([]);
    setRunning(true);
    setRhmiOpen(false);
    setWaitingOkOnTacho(false);
    stopLiveRef.current = false;

    try {
      const bluetooth = (navigator as Navigator & {
        bluetooth?: {
          requestDevice: (options: {
            acceptAllDevices: boolean;
            optionalServices: readonly string[];
          }) => Promise<BleDevice>;
        };
      }).bluetooth;

      if (!bluetooth) {
        throw new Error("Web Bluetooth nije podržan u ovom pretraživaču. Koristite Chrome na Android telefonu.");
      }

      addLog("info", "Otvaram Bluetooth pretragu...");
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS,
      });

      setDeviceName(device.name || "Tahograf");
      addLog("pass", `Izabran uređaj: ${device.name || "Bez imena"}`);

      if (!device.gatt) throw new Error("GATT interfejs nije dostupan");
      addLog("info", "Povezujem se na GATT server...");
      const server = await device.gatt.connect();

      const services = await server.getPrimaryServices();
      const diagService = services.find(
        (s) => s.uuid.toLowerCase() === TACHO_DIAGNOSTICS_SERVICE_UUID.toLowerCase()
      );

      if (!diagService) {
        throw new Error("Nije pronađen Smart Tacho Diagnostics servis (fa213def...)");
      }
      addLog("pass", "Pronađen Diagnostics servis.");

      const chars = await diagService.getCharacteristics();
      const fifo = chars.find(
        (c) => c.uuid.toLowerCase() === TACHO_DIAGNOSTICS_FIFO_UUID.toLowerCase()
      );
      const credits = chars.find(
        (c) => c.uuid.toLowerCase() === TACHO_DIAGNOSTICS_CREDITS_UUID.toLowerCase()
      );

      if (!fifo || !credits) {
        throw new Error("Nisu pronađeni FIFO ili Credits karakteristike");
      }
      fifoRef.current = fifo;
      creditsRef.current = credits;

      // Postavljamo osluškivanje dolaznih poruka (Indications)
      let incomingResolver: ((packet: number[]) => void) | null = null;
      fifo.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength) return;
        const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        
        // Dopunjavamo Kredite tahografu (Flow Control) odmah nakon svakog primljenog paketa
        writeGatt(credits, [1]).catch(() => {});
        
        if (incomingResolver) {
          const res = incomingResolver;
          incomingResolver = null;
          res(packet);
        }
      });

      let creditResolver: ((c: number) => void) | null = null;
      credits.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength || !creditResolver) return;
        const res = creditResolver;
        creditResolver = null;
        res(view.getUint8(0));
      });

      await credits.startNotifications();
      await fifo.startNotifications();
      addLog("pass", "Indications aktivirane na FIFO i Credits.");

      // Flow control razmena (šaljemo početni kredit)
      const serverCreditPromise = new Promise<number>((res) => { creditResolver = res; });
      await writeGatt(credits, [1]);
      const serverCredit = await Promise.race([serverCreditPromise, sleep(4000).then(() => null)]);
      creditResolver = null;

      if (serverCredit === null) throw new Error("Tahograf nije vratio server kredit (Timeout)");
      if (serverCredit === 0xff) throw new Error("Tahograf je odbio flow control (-1 / 0xFF)");
      addLog("pass", `Flow control uspostavljen. Server kredit: ${serverCredit}`);
      setConnected(true);

      // Pomoćna funkcija za slanje UDS komandi i čekanje odgovora
      const sendUds = async (payload: number[], timeoutMs = 4000): Promise<number[] | null> => {
        const respPromise = new Promise<number[]>((res) => { incomingResolver = res; });
        // Transport header: [1, 1, ...payload]
        await writeGatt(fifo, [1, 1, ...payload]);
        const res = await Promise.race([respPromise, sleep(timeoutMs).then(() => null)]);
        incomingResolver = null;
        return res;
      };

      // 1. TesterPresent (01 01 3E 00)
      addLog("info", "Šaljem TesterPresent (0x3E 0x00)...");
      const tpResp = await sendUds([0x3e, 0x00]);
      if (!tpResp || tpResp[2] !== 0x7e) {
        throw new Error(`TesterPresent nije dobio pozitivan odgovor: ${tpResp ? tpResp.join(" ") : "Timeout"}`);
      }
      addLog("pass", "TesterPresent uspešan (0x7E 0x00).");

      // 2. Open Remote HMI Routine (01 01 31 01 F2 11)
      addLog("info", "Otvaram Remote HMI sesiju (Routine 0xF211)...");
      const openResp = await sendUds([0x31, 0x01, 0xf2, 0x11]);
      const openClass = classifyOpenRhmiPacket(openResp ?? []);
      addLog("info", `Start Routine odgovor: ${openClass.responseType}`);

      // 3. Status Polling petlja (čekamo potvrdu vozača ako je 0x01, dok ne postane 0x10)
      let isOpen = false;
      for (let poll = 1; poll <= 20; poll++) {
        await sleep(1000);
        const statusResp = await sendUds([0x31, 0x03, 0xf2, 0x11], 2500);
        const statusClass = classifyOpenRhmiPacket(statusResp ?? []);
        
        if (statusClass.responseType === "status-positive") {
          const code = statusClass.statusCode;
          const statusText = describeRhmiStatus(code);
          
          if (code === 0x01) {
            setWaitingOkOnTacho(true);
            addLog("warn", `[${poll}/20] Čeka se potvrda vozača: PRITISNITE OK NA TAHOGRAFU!`);
          } else if (code === 0x10) {
            isOpen = true;
            setWaitingOkOnTacho(false);
            setRhmiOpen(true);
            addLog("pass", "🎉 REMOTE HMI SESIJA JE OTVORENA (Status 0x10)!");
            break;
          } else if (code === 0x20) {
            throw new Error("Vozač je odbio pristup na ekranu tahografa (User Rejected)");
          } else {
            addLog("info", `RHMI Status [${poll}]: ${statusText} (kod: ${code})`);
          }
        } else {
          addLog("warn", `Status query [${poll}]: ${statusClass.responseType}`);
        }
      }

      if (!isOpen) {
        throw new Error("Isteklo vreme za potvrdu Remote HMI sesije");
      }

      // 4. Pokrećemo živo čitanje podataka (Live Stream)
      setLiveStreamActive(true);
      startLiveStream(sendUds);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog("fail", `Greška: ${msg}`);
      setConnected(false);
      setRhmiOpen(false);
      setWaitingOkOnTacho(false);
    } finally {
      setRunning(false);
    }
  };

  // Petlja za periodično osvežavanje podataka sa tahografa
  const startLiveStream = async (sendUds: (payload: number[], timeoutMs?: number) => Promise<number[] | null>) => {
    addLog("info", "Pokrećem živi strim podataka sa tahografa (svake 2s)...");
    
    while (!stopLiveRef.current) {
      try {
        // Čitanje DID 0xF903 (Driver 1 Working State & Continuous Driving Time)
        const f903Resp = await sendUds([0x22, 0xf9, 0x03], 2000);
        if (f903Resp && f903Resp[2] === 0x62) {
          const parsed = parseDriverWorkingState(f903Resp);
          if (parsed.valid) {
            setActivity(parsed.activity);
            setContinuousDrivingSec(parsed.continuousDrivingSeconds);
          }
        }

        // Čitanje DID 0xF90B (Cumulative Break Time)
        const f90bResp = await sendUds([0x22, 0xf9, 0x0b], 2000);
        if (f90bResp && f90bResp[2] === 0x62 && f90bResp.length >= 7) {
          const breakMin = ((f90bResp[5] ?? 0) << 8) | (f90bResp[6] ?? 0);
          if (breakMin < 0xff00) setBreakSec(breakMin * 60);
        }

        // Čitanje DID 0xF90C (Current Daily Driving Time)
        const f90cResp = await sendUds([0x22, 0xf9, 0x0c], 2000);
        if (f90cResp && f90cResp[2] === 0x62 && f90cResp.length >= 7) {
          const dailyMin = ((f90cResp[5] ?? 0) << 8) | (f90cResp[6] ?? 0);
          if (dailyMin < 0xff00) setDailyDrivingSec(dailyMin * 60);
        }

        // Održavamo TesterPresent
        await sendUds([0x3e, 0x00], 1000);

      } catch {
        addLog("warn", "Strim: preskočen ciklus");
      }
      await sleep(2000);
    }
  };

  const stopConnection = async () => {
    stopLiveRef.current = true;
    setLiveStreamActive(false);
    if (creditsRef.current) {
      try {
        await writeGatt(creditsRef.current, [0xff]);
      } catch {}
    }
    setConnected(false);
    setRhmiOpen(false);
    setWaitingOkOnTacho(false);
    addLog("info", "Veza sa tahografom je prekinuta.");
  };

  const formatHoursMin = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  };

  const continuousLimitSec = 4.5 * 3600; // 4h 30m
  const remainingUntilBreakSec = Math.max(0, continuousLimitSec - continuousDrivingSec);
  const drivingProgressPercent = Math.min(100, Math.round((continuousDrivingSec / continuousLimitSec) * 100));

  const getStatusColor = () => {
    if (continuousDrivingSec >= 4.25 * 3600) return "#ef4444"; // Crveno (> 4h 15m)
    if (continuousDrivingSec >= 4.0 * 3600) return "#f59e0b";  // Žuto (> 4h)
    return "#10b981"; // Zeleno
  };

  const getActivityLabel = () => {
    switch (activity) {
      case "drive": return { label: "VOŽNJA", color: "#10b981", icon: "🟢" };
      case "work": return { label: "RAD (ČEKIĆ)", color: "#f59e0b", icon: "🔨" };
      case "available": return { label: "SPREMAN (KREVET)", color: "#3b82f6", icon: "⏱️" };
      case "rest": return { label: "PAUZA / ODMOR", color: "#6366f1", icon: "☕" };
      default: return { label: "NEPOZNATO", color: "#6b7280", icon: "⚪" };
    }
  };

  const act = getActivityLabel();

  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "20px 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e5e7eb", paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e3a8a" }}>🚚 TachoCommand Live Cockpit</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Verzija za terensko testiranje: {APP_VERSION}</p>
        </div>
        <div>
          {connected ? (
            <button type="button" onClick={stopConnection} style={{ padding: "10px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
              Prekini vezu
            </button>
          ) : (
            <button type="button" onClick={connectAndStart} disabled={running} style={{ padding: "12px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: running ? "not-allowed" : "pointer" }}>
              {running ? "Povezujem…" : "⚡ Poveži se sa tahografom"}
            </button>
          )}
        </div>
      </div>

      {/* Upozorenje za pritisak OK na tahografu */}
      {waitingOkOnTacho && (
        <div style={{ margin: "20px 0", padding: 20, background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: 12, textAlign: "center", animation: "pulse 1.5s infinite" }}>
          <h2 style={{ margin: 0, color: "#b45309", fontSize: 20 }}>⚠️ POGLEDAJTE EKRAN TAHOGRAFA</h2>
          <p style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 700, color: "#92400e" }}>
            Pritisnite taster <span style={{ background: "#d97706", color: "#fff", padding: "2px 8px", borderRadius: 4 }}>OK</span> na tahografu da odobrite daljinski pristup!
          </p>
        </div>
      )}

      {/* ŽIVI KOKPIT EKRAN */}
      <div style={{ marginTop: 24, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>Uređaj: <strong>{deviceName}</strong></span>
            {rhmiOpen && <span style={{ marginLeft: 8, padding: "2px 6px", background: "#d1fae5", color: "#065f46", fontSize: 11, borderRadius: 4, fontWeight: 700 }}>RHMI AKTIVAN</span>}
            {liveStreamActive && <span style={{ marginLeft: 6, padding: "2px 6px", background: "#dbeafe", color: "#1e40af", fontSize: 11, borderRadius: 4, fontWeight: 700 }}>LIVE</span>}
          </div>
          <span style={{ padding: "6px 14px", borderRadius: 20, background: act.color, color: "#fff", fontWeight: 800, fontSize: 14 }}>
            {act.icon} {act.label}
          </span>
        </div>

        {/* Glavni digitalni merač vožnje */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          
          {/* Kontinuirana vožnja */}
          <div style={{ background: "#ffffff", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Kontinuirana vožnja</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: getStatusColor(), margin: "8px 0" }}>
              {formatHoursMin(continuousDrivingSec)}
            </div>
            {/* Progress bar */}
            <div style={{ width: "100%", height: 10, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${drivingProgressPercent}%`, height: "100%", background: getStatusColor(), transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              <span>0h</span>
              <span>Maks: 04h 30m</span>
            </div>
          </div>

          {/* Preostalo do obavezne pauze */}
          <div style={{ background: "#ffffff", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Preostalo do pauze</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: remainingUntilBreakSec < 900 ? "#ef4444" : "#1f2937", margin: "8px 0" }}>
              {formatHoursMin(remainingUntilBreakSec)}
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {remainingUntilBreakSec === 0 ? "⚠️ Obavezna pauza od 45 min!" : "Dozvoljeno vreme vožnje"}
            </span>
          </div>

          {/* Dnevna vožnja */}
          <div style={{ background: "#ffffff", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Dnevna vožnja</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#1f2937", margin: "8px 0" }}>
              {formatHoursMin(dailyDrivingSec)}
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Maks: 09h 00m (ili 10h)</span>
          </div>

          {/* Kumulativna pauza */}
          <div style={{ background: "#ffffff", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Kumulativna pauza</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: breakSec >= 2700 ? "#10b981" : "#1f2937", margin: "8px 0" }}>
              {formatHoursMin(breakSec)}
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{breakSec >= 2700 ? "Ispunjeno 45 min" : "Obavezno 45 min"}</span>
          </div>

        </div>
      </div>

      {/* Dnevnik komunikacije (Protokol Log) */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📋 Dnevnik protokola (Live BLE Log)</h3>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(logs, null, 2))}
            disabled={logs.length === 0}
            style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
          >
            Kopiraj dnevnik
          </button>
        </div>
        <div style={{ background: "#111827", color: "#f3f4f6", padding: 14, borderRadius: 10, height: 220, overflowY: "auto", fontFamily: "monospace", fontSize: 12 }}>
          {logs.length === 0 ? (
            <span style={{ color: "#6b7280" }}>Kliknite na dugme &apos;Poveži se sa tahografom&apos; za početak...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 4, color: log.level === "pass" ? "#34d399" : log.level === "warn" ? "#fbbf24" : log.level === "fail" ? "#f87171" : "#9ca3af" }}>
                <span style={{ color: "#6b7280" }}>[{log.time}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>

    </main>
  );
}
