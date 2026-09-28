"use client";

import { useRef, useState } from "react";
import {
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import {
  buildReadDataByIdentifier,
  inspectVehicleSpeedDid,
  parseDriverMinutesDid,
  parseDriverWorkingState,
  RHMI_DIDS,
} from "../../lib/tacho-rhmi.js";
import { createTechnicalTelemetryAttemptCode } from "../../lib/technical-telemetry.js";
import { postTechnicalTelemetry } from "../../lib/technical-telemetry-client.js";
import { createUdsResponseCollector } from "../../lib/tacho-uds.js";
import { formatTachoCommandVersionLine, TACHOCOMMAND_VERSIONS } from "../../lib/product-version.js";

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
type TelemetryEvent = Record<string, unknown>;

type PendingRequest = {
  collector: UdsCollector;
  resolve: (response: number[] | null) => void;
  reject: (error: Error) => void;
};

const APP_VERSION = TACHOCOMMAND_VERSIONS.app;
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(remainingMinutes).padStart(2, "0")}m`;
};
const formatSeconds = (seconds: number | null) => seconds === null ? "—" : formatMinutes(Math.floor(seconds / 60));

const writeGatt = async (char: BleCharacteristic, bytes: number[]) => {
  const value = Uint8Array.from(bytes);
  if (char.properties?.write && char.writeValueWithResponse) return char.writeValueWithResponse(value);
  if (char.properties?.writeWithoutResponse && char.writeValueWithoutResponse) return char.writeValueWithoutResponse(value);
  if (char.writeValue) return char.writeValue(value);
  if (char.writeValueWithResponse) return char.writeValueWithResponse(value);
  if (char.writeValueWithoutResponse) return char.writeValueWithoutResponse(value);
  throw new Error("Write metoda nije dostupna na karakteristici");
};

const telemetryStatusLabel = (status: string, accepted: number) => {
  if (status === "accepted") return `upisano ${accepted}`;
  if (status === "storage_unavailable") return "baza nije dostupna";
  if (status === "network_unavailable") return "mreža nije dostupna";
  if (status === "no_valid_events") return "nema validnih događaja";
  return "odbijeno";
};

function DtcoPairingGuide() {
  const stepStyle = { marginBottom: 8, lineHeight: 1.45 } as const;
  const sectionStyle = { marginTop: 14, paddingTop: 14, borderTop: "1px solid #d1d5db" } as const;

  return (
    <section
      aria-label="DTCO 4.1a Bluetooth uputstvo"
      style={{ marginTop: 14, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#f8fafc", color: "#111827" }}
    >
      <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>Prvi put povezuješ telefon?</h2>
      <p style={{ margin: "0 0 12px", fontSize: 14 }}>
        Uradi redom. Ako je telefon već uparen i vidiš ga u „Geräte verwalten“, nemoj ga brisati.
      </p>

      <div style={sectionStyle}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>1. Uključi ITS podatke</h3>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14 }}>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Pritisni strelicu dole 2 puta.</li>
          <li style={stepStyle}>Na ekranu piše VOZAČ 1.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Pritisni strelicu dole 2 puta.</li>
          <li style={stepStyle}>Na ekranu piše PODEŠAVANJA.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Na ekranu piše ITS PODACI.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Pritisni OK još jednom da potvrdiš.</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>2. Upari telefon sa DTCO 4.1a</h3>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14 }}>
          <li style={stepStyle}>Vrati se na normalni ekran tahografa.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Pritisni strelicu dole 2 puta.</li>
          <li style={stepStyle}>Na ekranu piše VOZAČ 1.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Pritisni strelicu dole 3 puta.</li>
          <li style={stepStyle}>Na ekranu piše BLUETOOTH.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Na ekranu piše PAIRING / Koppelung.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Tahograf prikazuje Bitte verbinden.</li>
          <li style={stepStyle}>Na telefonu otvori Bluetooth i izaberi DTCO 4.1x.</li>
          <li style={stepStyle}>Proveri da je isti 6-cifreni PIN na telefonu i tahografu.</li>
          <li style={stepStyle}>Na telefonu potvrdi Pair / Koppeln.</li>
          <li style={stepStyle}>Na tahografu pritisni strelicu dole da potvrdiš Ja.</li>
          <li style={stepStyle}>Pritisni OK.</li>
          <li style={stepStyle}>Tahograf prikazuje Eingabe gespeichert.</li>
          <li style={stepStyle}>Proveri da se Bluetooth simbol pojavio u gornjoj liniji ekrana.</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>3. Poveži TachoCommand</h3>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14 }}>
          <li style={stepStyle}>Vrati se u TachoCommand.</li>
          <li style={stepStyle}>Tek sada dodirni Poveži tahograf.</li>
          <li style={stepStyle}>U Chrome Bluetooth prozoru izaberi svoj DTCO.</li>
        </ol>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Ako ne radi</h3>
        <details style={{ marginBottom: 8 }}>
          <summary>Telefon ne vidi tahograf</summary>
          <p style={{ fontSize: 14 }}>Proveri da je kartica vozača ubačena, da je Bluetooth simbol aktivan i ponovi PAIRING korake iznad.</p>
        </details>
        <details style={{ marginBottom: 8 }}>
          <summary>ITS podaci nisu uključeni</summary>
          <p style={{ fontSize: 14 }}>Vrati se na korak 1 i uključi ITS PODACI pre povezivanja aplikacije.</p>
        </details>
        <details style={{ marginBottom: 8 }}>
          <summary>Chrome nema Bluetooth dozvolu</summary>
          <p style={{ fontSize: 14 }}>U Android dozvolama za Chrome dozvoli Bluetooth / Uređaje u blizini, pa se vrati u TachoCommand.</p>
        </details>
        <details style={{ marginBottom: 8 }}>
          <summary>Telefon je već uparen, ali ga TachoCommand ne prikazuje</summary>
          <p style={{ fontSize: 14 }}>Ne briši uređaj iz Geräte verwalten. Zatvori Chrome izbor uređaja, proveri da je Bluetooth simbol aktivan i ponovo dodirni Poveži tahograf.</p>
        </details>
        <details>
          <summary>Pomoćno: nRF Connect for Mobile</summary>
          <p style={{ fontSize: 14 }}>
            Ako uređaji neće da se povežu, nRF Connect for Mobile može da posluži samo kao pomoćna provera:
            pokreni Scan, pronađi DTCO i probaj Connect da vidiš da li ga telefon uopšte vidi preko Bluetooth LE.
            Ne menjaj servise i ne šalji podatke iz nRF Connect-a. Pre povratka u TachoCommand prekini tu pomoćnu vezu.
          </p>
        </details>
      </div>
    </section>
  );
}

export default function ReadOnlyFieldTestClient() {
  const [running, setRunning] = useState(false);
  const [showPairingGuide, setShowPairingGuide] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [activity, setActivity] = useState("unknown");
  const [speedProbe, setSpeedProbe] = useState("nije provereno");
  const [continuousDrivingSec, setContinuousDrivingSec] = useState<number | null>(null);
  const [breakSec, setBreakSec] = useState<number | null>(null);
  const [dailyDrivingSec, setDailyDrivingSec] = useState<number | null>(null);
  const [weeklyDrivingSec, setWeeklyDrivingSec] = useState<number | null>(null);
  const [attemptCode, setAttemptCode] = useState("—");
  const [telemetryStatus, setTelemetryStatus] = useState("nije poslato");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const stopRef = useRef(false);
  const creditsRef = useRef<BleCharacteristic | null>(null);
  const gattWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sessionIdRef = useRef<string | null>(null);
  const attemptCodeRef = useRef<string | null>(null);

  const queueGattWrite = (char: BleCharacteristic, bytes: number[]) => {
    const operation = gattWriteQueueRef.current
      .catch(() => {})
      .then(() => writeGatt(char, bytes));
    gattWriteQueueRef.current = operation.catch(() => {});
    return operation;
  };

  const addLog = (level: LogEntry["level"], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((previous) => [{ time, level, message }, ...previous.slice(0, 79)]);
  };

  const connectAndStart = async () => {
    setLogs([]);
    setRunning(true);
    stopRef.current = false;
    gattWriteQueueRef.current = Promise.resolve();
    setActivity("unknown");
    setSpeedProbe("nije provereno");
    setContinuousDrivingSec(null);
    setBreakSec(null);
    setDailyDrivingSec(null);
    setWeeklyDrivingSec(null);
    setTelemetryStatus("prikuplja se do kraja prolaza");

    const attemptCode = createTechnicalTelemetryAttemptCode(window.crypto);
    setAttemptCode(attemptCode);
    attemptCodeRef.current = attemptCode;
    const sessionId = window.crypto.randomUUID();
    sessionIdRef.current = sessionId;
    const telemetryEvents: TelemetryEvent[] = [];
    let currentPhase = "bluetooth";
    const sessionStartedAt = performance.now();
    const addTechnicalEvent = (
      event: string,
      phase: string,
      outcome: string,
      extra: TelemetryEvent = {},
    ) => {
      telemetryEvents.push({
        sessionId,
        attemptCode,
        event,
        phase,
        outcome,
        deviceFamily: "unknown",
        ...extra,
      });
    };

    addTechnicalEvent("connect_start", "bluetooth", "start");
    addLog("info", `Šifra pokušaja: ${attemptCode}`);

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

      currentPhase = "gatt";
      const gattStartedAt = performance.now();
      if (!device.gatt) throw new Error("GATT interfejs nije dostupan");
      const server = await device.gatt.connect();
      addTechnicalEvent("gatt_connected", "gatt", "positive", {
        durationMs: Math.round(performance.now() - gattStartedAt),
      });

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
        // Web Bluetooth permits only one in-flight GATT operation. Queue the
        // returned client credit before resolving the response so the next
        // UDS request cannot overlap this characteristic write.
        void queueGattWrite(credits, [1]).catch(() => {});

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

      currentPhase = "transport";
      const transportStartedAt = performance.now();
      await credits.startNotifications();
      await fifo.startNotifications();

      const serverCreditPromise = new Promise<number>((resolve) => { creditResolver = resolve; });
      await queueGattWrite(credits, [1]);
      const serverCredit = await Promise.race([serverCreditPromise, sleep(4000).then(() => null)]);
      creditResolver = null;
      if (serverCredit === null) throw new Error("Server credit timeout");
      if (serverCredit === 0xff) throw new Error("Tahograf je odbio flow control");
      addTechnicalEvent("transport_ready", "transport", "positive", {
        durationMs: Math.round(performance.now() - transportStartedAt),
      });
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
          queueGattWrite(fifo, [1, 1, ...payload]).catch((error) => {
            if (pendingRequest?.collector === collector) pendingRequest = null;
            finishReject(error instanceof Error ? error : new Error(String(error)));
          });
        });
      };

      // Zdravlje transporta proveravamo pre prvog read-only RDBI zahteva.
      currentPhase = "tester_present";
      const testerPresentStartedAt = performance.now();
      const testerPresent = await sendUds([0x3e, 0x00]);
      if (!testerPresent || testerPresent[2] !== 0x7e) {
        throw new Error("TesterPresent nije dobio pozitivan odgovor");
      }
      addTechnicalEvent("tester_present", "tester_present", "positive", {
        durationMs: Math.round(performance.now() - testerPresentStartedAt),
      });

      setConnected(true);
      addLog("pass", "TesterPresent potvrđen. Sačekajte 1 s za stabilizaciju transporta.");
      await sleep(1000);
      addLog("info", "Pokrećem lokalnu F902 proveru formata, zatim jedan opservacioni prolaz kroz pet potvrđenih RDBI DID-ova.");

      currentPhase = "live_read";
      const snapshotStartedAt = performance.now();
      const formatDid = (did: number) => did.toString(16).padStart(4, "0").toUpperCase();
      const classifyFailure = (
        label: string,
        response: number[] | null,
        durationMs: number,
      ) => {
        if (!response) {
          addTechnicalEvent("timeout", "live_read", "timeout", {
            did: label,
            durationMs,
            errorCode: "read_timeout",
          });
          addLog("warn", `${label} rezultat: TIMEOUT.`);
          return true;
        }
        if (response[2] === 0x7f && response[3] === 0x22) {
          addTechnicalEvent("nrc", "live_read", "nrc", {
            did: label,
            durationMs,
            nrc: Number(response[4] ?? 0),
            errorCode: "negative_response",
          });
          addLog("warn", `${label} rezultat: NRC 0x${Number(response[4] ?? 0).toString(16).padStart(2, "0").toUpperCase()}.`);
          return true;
        }
        return false;
      };

      const probeMinutes = async (
        label: string,
        did: number,
        setter: (seconds: number | null) => void,
      ) => {
        const startedAt = performance.now();
        const response = await sendUds(buildReadDataByIdentifier(did), 4000);
        const durationMs = Math.round(performance.now() - startedAt);
        if (classifyFailure(label, response, durationMs)) return;
        const parsed = parseDriverMinutesDid(response ?? [], did);
        if (parsed.valid) {
          setter(parsed.minutes * 60);
          addTechnicalEvent("did_read", "live_read", "positive", { did: label, durationMs });
          addLog("pass", `${label} rezultat: POSITIVE — ${formatMinutes(parsed.minutes)} (${parsed.minutes} min).`);
        } else {
          addTechnicalEvent("error", "live_read", "error", {
            did: label,
            durationMs,
            errorCode: "unexpected_response",
          });
          addLog("warn", `${label} rezultat: UNEXPECTED — servis 0x${Number(response?.[2] ?? 0).toString(16).padStart(2, "0").toUpperCase()}.`);
        }
        await sleep(350);
      };

      const f902StartedAt = performance.now();
      const f902Response = await sendUds(
        buildReadDataByIdentifier(RHMI_DIDS.TACHOGRAPH_VEHICLE_SPEED),
        4000,
      );
      const f902DurationMs = Math.round(performance.now() - f902StartedAt);
      if (!f902Response) {
        setSpeedProbe("TIMEOUT");
        addLog("warn", "F902 rezultat: TIMEOUT. Brzina nije potvrđena; ovaj rezultat se ne šalje u telemetriju.");
      } else if (f902Response[2] === 0x7f && f902Response[3] === 0x22) {
        const nrc = Number(f902Response[4] ?? 0).toString(16).padStart(2, "0").toUpperCase();
        setSpeedProbe(`NRC 0x${nrc}`);
        addLog("warn", `F902 rezultat: NRC 0x${nrc}. Brzina nije potvrđena; ovaj rezultat se ne šalje u telemetriju.`);
      } else {
        const inspected = inspectVehicleSpeedDid(f902Response);
        if (inspected.valid) {
          const payloadHex = inspected.payload
            .map((value) => value.toString(16).padStart(2, "0").toUpperCase())
            .join(" ");
          const localResult = `${inspected.payload.length} B · ${payloadHex || "prazno"}`;
          setSpeedProbe(localResult);
          addLog("pass", `F902 lokalni rezultat: POSITIVE — payload ${localResult}; trajanje ${f902DurationMs} ms. Nije poslato u telemetriju.`);
        } else {
          setSpeedProbe("UNEXPECTED");
          addLog("warn", "F902 rezultat: UNEXPECTED. Brzina nije potvrđena; ovaj rezultat se ne šalje u telemetriju.");
        }
      }
      await sleep(350);

      await probeMinutes("F923", RHMI_DIDS.DRIVER_1_CONTINUOUS_DRIVING, setContinuousDrivingSec);
      await probeMinutes("F925", RHMI_DIDS.DRIVER_1_CUMULATIVE_BREAK, setBreakSec);

      const f903StartedAt = performance.now();
      const f903Response = await sendUds(buildReadDataByIdentifier(RHMI_DIDS.DRIVER_1_WORKING_STATE), 4000);
      const f903DurationMs = Math.round(performance.now() - f903StartedAt);
      if (!classifyFailure("F903", f903Response, f903DurationMs)) {
        const parsed = parseDriverWorkingState(f903Response ?? []);
        if (parsed.valid) {
          setActivity(parsed.activity);
          addTechnicalEvent("did_read", "live_read", "positive", {
            did: "F903",
            durationMs: f903DurationMs,
          });
          addLog("pass", `F903 rezultat: POSITIVE — aktivnost ${parsed.activity.toUpperCase()}.`);
        } else {
          addTechnicalEvent("error", "live_read", "error", {
            did: "F903",
            durationMs: f903DurationMs,
            errorCode: "unexpected_response",
          });
          addLog("warn", `F903 rezultat: UNEXPECTED — DID ${formatDid(RHMI_DIDS.DRIVER_1_WORKING_STATE)}.`);
        }
      }
      await sleep(350);

      await probeMinutes("F99A", RHMI_DIDS.DRIVER_1_CURRENT_DAILY_DRIVING, setDailyDrivingSec);
      await probeMinutes("F99B", RHMI_DIDS.DRIVER_1_CURRENT_WEEKLY_DRIVING, setWeeklyDrivingSec);
      addTechnicalEvent("snapshot_complete", "live_read", "complete", {
        durationMs: Math.round(performance.now() - snapshotStartedAt),
      });
      addLog("info", "Jednokratni RDBI opservacioni prolaz je završen. Pritisnite Prekini.");
    } catch (error) {
      setConnected(false);
      addTechnicalEvent("error", currentPhase, "error", {
        durationMs: Math.round(performance.now() - sessionStartedAt),
        errorCode: "unknown",
      });
      addLog("fail", error instanceof Error ? error.message : String(error));
    } finally {
      const telemetryResult = await postTechnicalTelemetry(telemetryEvents);
      const label = telemetryStatusLabel(telemetryResult.status, telemetryResult.accepted);
      setTelemetryStatus(label);
      if (telemetryResult.status === "accepted") {
        addLog("pass", `TELEMETRY: ${label}.`);
      } else {
        addLog("warn", `TELEMETRY: ${label}. BLE rezultat je sačuvan samo u ovom prikazu.`);
      }
      setRunning(false);
    }
  };

  const stopConnection = async () => {
    stopRef.current = true;
    setConnected(false);
    if (creditsRef.current) {
      try {
        await queueGattWrite(creditsRef.current, [0xff]);
      } catch {}
    }

    if (sessionIdRef.current) {
      const result = await postTechnicalTelemetry([
        {
          sessionId: sessionIdRef.current,
          attemptCode: attemptCodeRef.current,
          event: "disconnected",
          phase: "teardown",
          outcome: "disconnected",
          deviceFamily: "unknown",
        },
      ]);
      if (result.status === "accepted") {
        setTelemetryStatus(`upisano +${result.accepted} teardown`);
      }
    }

    addLog("info", "Read-only sesija je zaustavljena.");
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>TachoCommand — Core Field Test</h1>
          <p style={{ margin: "4px 0", color: "#6b7280", fontSize: 13 }}>App {APP_VERSION}</p>
          <p style={{ margin: "2px 0", color: "#6b7280", fontSize: 11 }}>{formatTachoCommandVersionLine()}</p>
        </div>
        {connected ? (
          <button type="button" onClick={stopConnection}>Prekini</button>
        ) : (
          <button type="button" onClick={connectAndStart} disabled={running}>
            {running ? "Povezujem…" : "Poveži tahograf"}
          </button>
        )}
      </div>

      {!connected ? (
        <>
          <button
            type="button"
            onClick={() => setShowPairingGuide((visible) => !visible)}
            aria-expanded={showPairingGuide}
            style={{ marginTop: 12 }}
          >
            {showPairingGuide ? "Sakrij Bluetooth uputstvo" : "Prvi put? Bluetooth uputstvo"}
          </button>
          {showPairingGuide ? <DtcoPairingGuide /> : null}
        </>
      ) : null}

      <p style={{ padding: 12, background: "#f3f4f6", borderRadius: 10, fontSize: 13 }}>
        Ovaj kandidat prvo lokalno proverava format F902, zatim šalje po jedan read-only zahtev za F923, F925, F903, F99A i F99B.
        Ne otvara Remote HMI/F211 sesiju i ne ponavlja očitavanje u petlji.
        F902 payload ostaje samo u ovom prikazu i ne ulazi u telemetriju. Ostali tehnički događaji se drže samo u memoriji tokom BLE prolaza i šalju tek po njegovom završetku.
      </p>

      <div style={{ marginBottom: 8, fontSize: 14 }}>Uređaj: <strong>{deviceName}</strong></div>
      <div style={{ marginBottom: 8, fontSize: 14 }}>Šifra pokušaja: <strong>{attemptCode}</strong></div>
      <div style={{ marginBottom: 14, fontSize: 14 }}>Tehnička telemetrija: <strong>{telemetryStatus}</strong></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Bezbednosna proba brzine — F902 (lokalno)</small>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{speedProbe}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Trenutna aktivnost — F903</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{activity.toUpperCase()}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Neprekidna vožnja — F923</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatSeconds(continuousDrivingSec)}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Kumulativna pauza — F925</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatSeconds(breakSec)}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Dnevna vožnja — F99A (optional)</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatSeconds(dailyDrivingSec)}</div>
        </article>
        <article style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <small>Nedeljna vožnja — F99B (optional)</small>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatSeconds(weeklyDrivingSec)}</div>
        </article>
      </div>

      <section style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 16 }}>Dnevnik</h2>
          <button
            type="button"
            disabled={logs.length === 0}
            onClick={() => navigator.clipboard.writeText(logs
              .map((entry) => `[${entry.time}] ${entry.level.toUpperCase()}: ${entry.message}`)
              .join("\n"))}
          >
            Kopiraj dnevnik
          </button>
        </div>
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
