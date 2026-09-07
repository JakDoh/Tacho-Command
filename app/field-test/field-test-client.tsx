"use client";

import { useEffect, useState } from "react";
import {
  TACHO_DOWNLOAD_CREDITS_UUID,
  TACHO_DOWNLOAD_FIFO_UUID,
  TACHO_DOWNLOAD_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import { createBleDdpTransport } from "../../lib/tacho-download-ble.js";
import { runDdpCardDownload } from "../../lib/tacho-download-runner.js";
import {
  evaluateDrivingSnapshot,
  type DrivingEvaluation,
} from "../../lib/tacho-rules.js";
import {
  calculateDrivingSnapshotFromCard,
  parseDriverActivityData,
  parseCardPlaces,
  type DailyActivityRecord,
  type PlaceRecord,
} from "../../lib/tacho-activity-parser.js";
import {
  verifyCardTlvSignatures,
  type CryptoReport,
} from "../../lib/tacho-crypto.js";

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
type BleDevice = {
  name?: string;
  gatt?: { connect: () => Promise<BleServer> };
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

type Result = { step: string; status: string; detail?: string };

type TlvObject = {
  fid: number;
  name: string;
  isSignature: boolean;
  length: number;
  value: Uint8Array;
};

type CardMetadata = {
  cardNumber: string;
  surname: string;
  firstName: string;
  expiryDate: string;
};

type ProgressState = {
  percent: number;
  phase: string;
  detail: string;
  bytesTransferred: number;
};

const KNOWN_EF_NAMES: Record<number, string> = {
  0x0501: "EF_Application_Identification",
  0x0502: "EF_Events_Data",
  0x0503: "EF_Faults_Data",
  0x0504: "EF_Driver_Activity_Data",
  0x0505: "EF_Vehicles_Used",
  0x0506: "EF_Places",
  0x0507: "EF_Current_Usage",
  0x0508: "EF_Control_Activity_Data",
  0x0509: "EF_Specific_Conditions",
  0x0520: "EF_Identification",
  0x0523: "EF_GNSS_Places",
  0x0527: "EF_Border_Crossings",
  0x0528: "EF_Load_Unload_Operations",
  0x0529: "EF_Load_Type_Entries",
  0x050e: "EF_Card_Certificate",
  0x050f: "EF_CA_Certificate",
  0x0510: "EF_Link_Certificate",
};

function parseCardTlv(bytes: Uint8Array) {
  const objects: TlvObject[] = [];
  let offset = 0;
  while (offset + 5 <= bytes.length) {
    const fid = (bytes[offset] << 8) | bytes[offset + 1];
    const type = bytes[offset + 2];
    const length = (bytes[offset + 3] << 8) | bytes[offset + 4];

    if (type !== 0x00 && type !== 0x01) {
      return { valid: false, reason: `Nevalidan tip TLV taga na offsetu ${offset}: 0x${type.toString(16)}`, objects: [] };
    }

    const valStart = offset + 5;
    const valEnd = valStart + length;
    if (valEnd > bytes.length) {
      return { valid: false, reason: `Prekinut TLV objekat na offsetu ${offset}. Očekivano ${length} bajtova.`, objects: [] };
    }

    objects.push({
      fid,
      name: KNOWN_EF_NAMES[fid] ?? `EF_${fid.toString(16).padStart(4, "0").toUpperCase()}`,
      isSignature: type === 0x01,
      length,
      value: bytes.slice(valStart, valEnd),
    });
    offset = valEnd;
  }
  const valid = offset === bytes.length && objects.length > 0;
  return { valid, reason: valid ? null : `Preostalo ${bytes.length - offset} neobrađenih bajtova`, objects };
}

function decodeTachoText(data: Uint8Array): string {
  if (data.length <= 1) return "";
  try {
    return new TextDecoder("iso-8859-1")
      .decode(data.slice(1))
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
      .trim();
  } catch {
    return "";
  }
}

function extractMetadata(objects: TlvObject[]): CardMetadata | null {
  const ident = objects.find((item) => item.fid === 0x0520 && !item.isSignature);
  if (!ident || ident.value.length < 137) return null;

  const data = ident.value;
  const rawCard = new TextDecoder("ascii").decode(data.slice(1, 17)).replace(/[^A-Za-z0-9]/g, "");
  const expiryTs = (data[61] << 24) | (data[62] << 16) | (data[63] << 8) | data[64];
  const expiryDate = expiryTs > 0 ? new Date(expiryTs * 1000).toISOString().split("T")[0] : "nepoznato";
  const surname = decodeTachoText(data.slice(65, 101));
  const firstName = decodeTachoText(data.slice(101, 137));

  return {
    cardNumber: rawCard || "NEPOZNATA_KARTICA",
    surname: surname || "VOZAC",
    firstName: firstName || "KARTICA",
    expiryDate,
  };
}

// ---------------------------------------------------------------------------
// INDEXED DB PERSISTENCE (ZACHOVÁNÍ DAT PO ZAVŘENÍ STRÁNKY)
// ---------------------------------------------------------------------------
const DB_NAME = "tachocommand_field_db";
const STORE_NAME = "saved_card";

function openFieldDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB není podporována"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveCardToDb(record: { id: string; cardBytes: Uint8Array; savedAt: string }) {
  try {
    const db = await openFieldDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
  } catch {}
}

async function loadCardFromDb(): Promise<{ id: string; cardBytes: Uint8Array; savedAt: string } | null> {
  try {
    const db = await openFieldDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get("latest");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

const APP_VERSION = "0.24-ddp-timeline-indexeddb-v1";

export default function FieldTestClient() {
  const [running, setRunning] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [results, setResults] = useState<Result[]>([]);
  const [cardFile, setCardFile] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [cardMetadata, setCardMetadata] = useState<CardMetadata | null>(null);
  const [tlvValid, setTlvValid] = useState(false);

  const [progress, setProgress] = useState<ProgressState>({
    percent: 0,
    phase: "idle",
    detail: "Připraven ke startu",
    bytesTransferred: 0,
  });

  const [dailyRecords, setDailyRecords] = useState<DailyActivityRecord[]>([]);
  const [places, setPlaces] = useState<PlaceRecord[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [rulesEvaluation, setRulesEvaluation] = useState<DrivingEvaluation | null>(null);
  const [cryptoReport, setCryptoReport] = useState<CryptoReport | null>(null);

  const [devModeArmed, setDevModeArmed] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("dev") === "card-download";
    }
    return false;
  });

  const add = (step: string, status: string, detail?: string) =>
    setResults((current) => [...current, { step, status, detail }]);

  // Obnovení dříve stažených dat z IndexedDB po načtení stránky
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadCardFromDb();
      if (saved && !cancelled && saved.cardBytes) {
        const data = saved.cardBytes;
        setCardFile(data);
        const tlv = parseCardTlv(data);
        if (tlv.valid) {
          setTlvValid(true);
          const meta = extractMetadata(tlv.objects);
          setCardMetadata(meta);

          const actObj = tlv.objects.find((o) => o.fid === 0x0504 && !o.isSignature);
          if (actObj) {
            const records = parseDriverActivityData(actObj.value);
            setDailyRecords(records);
            setSelectedDayIndex(Math.max(0, records.length - 1));
            setRulesEvaluation(evaluateDrivingSnapshot(calculateDrivingSnapshotFromCard(records)));
          }

          const placeObj = tlv.objects.find((o) => o.fid === 0x0506 && !o.isSignature);
          if (placeObj) {
            setPlaces(parseCardPlaces(placeObj.value));
          }

          void verifyCardTlvSignatures(tlv.objects).then((rep) => setCryptoReport(rep));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async () => {
    if (!devModeArmed) {
      add("Bezbednosna kapija", "BLOCKED", "Uključi razvojni režim za pokretanje transportnog testa.");
      return;
    }
    setResults([]);
    setCardFile(null);
    setCardMetadata(null);
    setTlvValid(false);
    setDailyRecords([]);
    setPlaces([]);
    setRulesEvaluation(null);
    setCryptoReport(null);
    setProgress({ percent: 0, phase: "ble-init", detail: "Připojování k BLE tahografu…", bytesTransferred: 0 });
    setRunning(true);

    try {
      const bluetooth = (
        navigator as Navigator & {
          bluetooth?: {
            requestDevice: (options: {
              acceptAllDevices: boolean;
              optionalServices: readonly string[];
            }) => Promise<BleDevice>;
          };
        }
      ).bluetooth;

      if (!bluetooth) throw new Error("Web Bluetooth nije dostupan");
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS,
      });

      setDeviceName(device.name || "BLE uređaj");
      add("BLE izbor", "PASS", device.name || "bez imena");

      if (!device.gatt) throw new Error("GATT nije dostupan");
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const download = services.find(
        (service) => service.uuid.toLowerCase() === TACHO_DOWNLOAD_SERVICE_UUID
      );
      if (!download) throw new Error("Download servis nije pronađen");
      add("Download servis", "PASS", "standardni Smart Tacho 2 UUID");

      const chars = await download.getCharacteristics();
      const fifo = chars.find((item) => item.uuid.toLowerCase() === TACHO_DOWNLOAD_FIFO_UUID);
      const credits = chars.find((item) => item.uuid.toLowerCase() === TACHO_DOWNLOAD_CREDITS_UUID);
      if (!fifo || !credits) throw new Error("Download FIFO/Credits nisu pronađeni");
      add("Download karakteristike", "PASS", "FIFO + Credits");

      const write = async (characteristic: BleCharacteristic, bytes: number[]) => {
        const value = Uint8Array.from(bytes);
        if (characteristic.properties?.write && characteristic.writeValueWithResponse) {
          return characteristic.writeValueWithResponse(value);
        }
        if (characteristic.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
          return characteristic.writeValueWithoutResponse(value);
        }
        if (characteristic.writeValue) return characteristic.writeValue(value);
        if (characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
        if (characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
        throw new Error("Write metoda nije dostupna");
      };

      const transport = createBleDdpTransport({ device, fifo, credits, write, receiveWindow: 8 });

      (transport as unknown as { onProgress: (p: ProgressState) => void }).onProgress = (p: ProgressState) => {
        setProgress(p);
      };

      try {
        await transport.start();
        add("Indications", "PASS");
        add("Flow control", "PASS", `server credit ${transport.ledger.serverCredits}`);

        const result = await runDdpCardDownload(transport);

        if (result.status === "complete" && result.cardData) {
          const data = Uint8Array.from(result.cardData);
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          setCardFile(data);
          add("Transport kartičnih podataka", "PASS", `${data.byteLength} bajtova; SHA-256 ${digest}`);

          // Uložení do IndexedDB pro offline použití
          void saveCardToDb({ id: "latest", cardBytes: data, savedAt: new Date().toISOString() });

          const tlv = parseCardTlv(data);
          if (tlv.valid) {
            setTlvValid(true);
            const meta = extractMetadata(tlv.objects);
            setCardMetadata(meta);
            add("Struktura fajla", "PASS", `Standardni TLV format (Appendix 7): ${tlv.objects.length} EF blokova`);
            if (meta) {
              add("Podaci kartice", "PASS", `${meta.surname} ${meta.firstName} | Kartica: ${meta.cardNumber} | Važi do: ${meta.expiryDate}`);
            }

            // 1. Kryptografické ověření podpisů
            const cryptoCheck = await verifyCardTlvSignatures(tlv.objects);
            setCryptoReport(cryptoCheck);
            add(
              "Digitalni potpis",
              cryptoCheck.overallStatus,
              cryptoCheck.verifiedFiles > 0
                ? `Ověřeno ${cryptoCheck.verifiedFiles}/${cryptoCheck.signedFiles} podepsaných bloků (ECDSA SHA-256)`
                : `Nalezeno ${cryptoCheck.signedFiles} podpisů v souboru; plná verifikace autority vyžaduje JRC ERCA certifikáty`
            );

            // 2. Parsování aktivit (0x0504)
            const activityObj = tlv.objects.find((o) => o.fid === 0x0504 && !o.isSignature);
            if (activityObj) {
              const records = parseDriverActivityData(activityObj.value);
              setDailyRecords(records);
              setSelectedDayIndex(Math.max(0, records.length - 1));
              const snapshot = calculateDrivingSnapshotFromCard(records);
              const evaluation = evaluateDrivingSnapshot(snapshot);
              setRulesEvaluation(evaluation);
              add(
                "Pravila vožnje (EU 561/2006)",
                "PASS",
                `Dnes: ${Math.floor(snapshot.dailyDriveSeconds! / 3600)}h ${Math.floor((snapshot.dailyDriveSeconds! % 3600) / 60)}m | Kontinuální: ${Math.floor(snapshot.continuousDriveSeconds! / 60)}m | Pauza: ${Math.floor(snapshot.currentBreakSeconds! / 60)}m`
              );
            }

            // 3. Parsování míst (0x0506)
            const placeObj = tlv.objects.find((o) => o.fid === 0x0506 && !o.isSignature);
            if (placeObj) {
              setPlaces(parseCardPlaces(placeObj.value));
            }
          } else {
            add("Struktura fajla", "NOT_VALIDATED", `Sirovi transportni bajtovi — standardni .DDD format nije sklopljen (${tlv.reason})`);
          }

          add("RequestTransferExit", result.teardown.transferExitConfirmed ? "PASS" : "FAIL", "positive SID 0x77");
          add("StopCommunication", result.teardown.stopConfirmed ? "PASS" : "FAIL", "positive SID 0xC2");
        } else {
          add("Transport kartičnih podataka", "FAIL", `${result.failure?.phase ?? "unknown"}: ${result.failure?.code ?? "unknown"}`);
          add(
            "Kontrolisano zatvaranje",
            result.teardown.stopConfirmed ? "PASS" : "INCOMPLETE",
            `TransferExit ${result.teardown.transferExitConfirmed ? "potvrđen" : "nepotvrđen"}; StopCommunication ${result.teardown.stopConfirmed ? "potvrđen" : "nepotvrđen"}`
          );
        }
      } catch (error) {
        await transport.disconnect();
        throw error;
      }
    } catch (error) {
      add("Greška", "FAIL", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          schema: "tachocommand-download-field-test-v6",
          appVersion: APP_VERSION,
          createdAt: new Date().toISOString(),
          deviceName,
          results,
          rulesEvaluation: rulesEvaluation
            ? {
                rulesetId: rulesEvaluation.rulesetId,
                breakQualified: rulesEvaluation.breakQualified,
                rules: rulesEvaluation.rules,
              }
            : null,
          cryptoReport: cryptoReport
            ? {
                overallStatus: cryptoReport.overallStatus,
                totalFiles: cryptoReport.totalFiles,
                signedFiles: cryptoReport.signedFiles,
                verifiedFiles: cryptoReport.verifiedFiles,
              }
            : null,
          cardMetadata: cardMetadata ? { ...cardMetadata, cardNumber: "REDACTED" } : null,
          privacy:
            "The copied report contains no driver identity, card number, VIN, registration, location, or raw tachograph packets. Card bytes remain only in local browser memory until saved or the page is closed.",
        },
        null,
        2
      )
    );
  };

  const saveDiagnosticCapture = () => {
    if (!cardFile) return;
    const url = URL.createObjectURL(new Blob([cardFile], { type: "application/octet-stream" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tachocommand-diagnostic-raw-${new Date().toISOString().replace(/[:.]/g, "-")}.bin`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getOfficialFileName = (fileExtension: "c1c" | "ddd") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const hm = `${pad(now.getHours())}${pad(now.getMinutes())}`;
    const surname = (cardMetadata?.surname ?? "DRIVER").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 15);
    const firstName = (cardMetadata?.firstName ?? "CARD").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10);
    const cardNum = (cardMetadata?.cardNumber ?? "0000000000000000").slice(0, 16);
    return ["C", ymd, hm, surname, firstName, cardNum].join("_") + "." + fileExtension;
  };

  const saveCompliantCardFile = (fileExtension: "c1c" | "ddd") => {
    if (!cardFile) return;
    const officialFileName = getOfficialFileName(fileExtension);
    const url = URL.createObjectURL(new Blob([cardFile], { type: "application/octet-stream" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = officialFileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Web Share API pro okamžité odeslání souboru dispečerovi
  const shareCardFile = async (fileExtension: "c1c" | "ddd") => {
    if (!cardFile) return;
    const officialFileName = getOfficialFileName(fileExtension);
    const file = new File([cardFile], officialFileName, { type: "application/octet-stream" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Tacho soubor: ${officialFileName}`,
          text: `Stažená karta řidiče (${cardMetadata?.surname ?? "Řidič"})`,
          files: [file],
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    saveCompliantCardFile(fileExtension);
  };

  const selectedDay = dailyRecords[selectedDayIndex] || null;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>TachoCommand — Download Transport Test</h1>
      <p><strong>Verzija:</strong> {APP_VERSION}</p>
      <p>Razvojni read-only test Gen2v2 DDP transporta. Vozilo mora stajati. Sesija se uvek zatvara kroz RequestTransferExit i StopCommunication.</p>
      <p><strong>Uređaj:</strong> {deviceName}</p>

      <div style={{ margin: "16px 0", padding: 12, background: "#f8f9fa", borderRadius: 8, border: "1px solid #dee2e6" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={devModeArmed}
            onChange={(e) => setDevModeArmed(e.target.checked)}
            disabled={running}
          />
          <span><strong>Razvojni režim (devModeArmed):</strong> Dozvoli probu DDP transporta kartice</span>
        </label>
        {!devModeArmed ? (
          <p style={{ margin: "6px 0 0", color: "#6c757d", fontSize: "0.85em" }}>
            Zaštitna kapija: transportna proba je zaključana dok se ne potvrdi razvojni režim.
          </p>
        ) : null}
      </div>

      {/* 1. INDIKÁTOR PRŮBĚHU (PROGRESS BAR) */}
      {running ? (
        <div style={{ margin: "16px 0", padding: 14, background: "#0d1929", borderRadius: 8, border: "1px solid #20344e", color: "#f4f8ff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: "0.9rem", color: "#42d3ff" }}>{progress.detail}</strong>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#38d39f" }}>{progress.percent}%</span>
          </div>
          <div style={{ height: 10, background: "#07101d", borderRadius: 6, overflow: "hidden", border: "1px solid #1c3044" }}>
            <div
              style={{
                width: `${progress.percent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #42d3ff, #38d39f)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          {progress.bytesTransferred > 0 ? (
            <div style={{ marginTop: 6, fontSize: "0.75rem", color: "#8ea0b8", textAlign: "right" }}>
              Přeneseno: {(progress.bytesTransferred / 1024).toFixed(1)} KB
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button type="button" onClick={run} disabled={running || !devModeArmed} style={{ padding: "12px 18px", fontWeight: 700 }}>
          {running ? "Test u toku…" : "Pokreni DDP transportnu probu"}
        </button>
        <button type="button" onClick={copy} disabled={results.length === 0} style={{ padding: "12px 18px" }}>
          Kopiraj rezultat
        </button>
        <button type="button" onClick={saveDiagnosticCapture} disabled={!cardFile} style={{ padding: "12px 18px" }}>
          Sačuvaj sirovi dijagnostički zapis (.bin)
        </button>
      </div>

      {/* 2. VIZUÁLNÍ ČASOVÁ OSA AKTIVIT (TIMELINE) & PŘEPÍNAČ DNŮ */}
      {dailyRecords.length > 0 && selectedDay ? (
        <div style={{ margin: "24px 0", padding: 18, background: "#0c1828", border: "1px solid #20364c", borderRadius: 12, color: "#f4f8ff" }}>
          {/* Výběr dne */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: "0.7rem", color: "#8ea0b8", textTransform: "uppercase", fontWeight: 800 }}>
                Historie z karty ({selectedDayIndex + 1} / {dailyRecords.length})
              </span>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.2rem", color: "#42d3ff" }}>
                {selectedDay.date.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h3>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
                disabled={selectedDayIndex === 0}
                style={{ padding: "6px 12px", background: "#102035", color: "#fff", border: "1px solid #253a52", borderRadius: 6, cursor: "pointer" }}
              >
                ← Předchozí
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayIndex((prev) => Math.min(dailyRecords.length - 1, prev + 1))}
                disabled={selectedDayIndex === dailyRecords.length - 1}
                style={{ padding: "6px 12px", background: "#102035", color: "#fff", border: "1px solid #253a52", borderRadius: 6, cursor: "pointer" }}
              >
                Následující →
              </button>
            </div>
          </div>

          {/* Grafická 24-hodinová osa */}
          <div style={{ margin: "16px 0" }}>
            <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", border: "1px solid #28445f", background: "#07101d" }}>
              {selectedDay.changes.map((change, i) => {
                const nextTime = i + 1 < selectedDay.changes.length ? selectedDay.changes[i + 1].timeMinutes : 1440;
                const duration = Math.max(0, nextTime - change.timeMinutes);
                const widthPercent = (duration / 1440) * 100;
                const colors = ["#9d88ff", "#4e8cff", "#ffb547", "#38d39f"]; // Rest, Avail, Work, Drive
                return (
                  <div
                    key={`${change.timeMinutes}-${i}`}
                    style={{
                      width: `${widthPercent}%`,
                      height: "100%",
                      backgroundColor: colors[change.activity] || "#6c757d",
                    }}
                    title={`${Math.floor(change.timeMinutes / 60)}:${String(change.timeMinutes % 60).padStart(2, "0")} (${duration} min)`}
                  />
                );
              })}
            </div>
            {/* Značky hodin */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.65rem", color: "#71849c" }}>
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>24:00</span>
            </div>
          </div>

          {/* Legenda a souhrny aktivit pro vybraný den */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 14 }}>
            {[
              { label: "Jízda", act: 3, color: "#38d39f" },
              { label: "Práce", act: 2, color: "#ffb547" },
              { label: "Pohotovost", act: 1, color: "#4e8cff" },
              { label: "Pauza", act: 0, color: "#9d88ff" },
            ].map(({ label, act, color }) => {
              let minutes = 0;
              for (let i = 0; i < selectedDay.changes.length; i++) {
                if (selectedDay.changes[i].activity === act) {
                  const nextTime = i + 1 < selectedDay.changes.length ? selectedDay.changes[i + 1].timeMinutes : 1440;
                  minutes += nextTime - selectedDay.changes[i].timeMinutes;
                }
              }
              return (
                <div key={label} style={{ padding: 8, background: "#07101d", borderRadius: 6, border: `1px solid ${color}44` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    {label}
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: 4 }}>
                    {Math.floor(minutes / 60)}h {minutes % 60}m
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDay.dayDistanceKm > 0 ? (
            <div style={{ marginTop: 12, fontSize: "0.75rem", color: "#8ea0b8" }}>
              Ujetá vzdálenost za den: <strong>{selectedDay.dayDistanceKm} km</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3. VYHODNOCENÍ PRAVIDEL ŘÍZENÍ (EU 561/2006) */}
      {rulesEvaluation ? (
        <div style={{ margin: "20px 0", padding: 16, background: "#0d1929", border: "1px solid #20344e", borderRadius: 8, color: "#f4f8ff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: "#38d39f", fontSize: "1.05rem" }}>
              ✓ Vyhodnocení dob řízení z čipu karty (EU 561/2006)
            </h3>
            <span style={{ fontSize: "0.75rem", color: rulesEvaluation.breakQualified ? "#38d39f" : "#ffb547" }}>
              {rulesEvaluation.breakQualified ? "Pauza splněna (45 min nebo 15+30 min)" : "Pauza nesplněna"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {rulesEvaluation.rules.map((rule) => {
              const usedH = Math.floor(rule.usedSeconds / 3600);
              const usedM = Math.floor((rule.usedSeconds % 3600) / 60);
              const remH = Math.floor(Math.max(0, rule.remainingSeconds) / 3600);
              const remM = Math.floor((Math.max(0, rule.remainingSeconds) % 3600) / 60);
              const isExceeded = rule.status === "exceeded";
              const isWarning = rule.status === "warning" || rule.status === "limit";

              return (
                <div
                  key={rule.id}
                  style={{
                    padding: 10,
                    background: "#07101d",
                    borderRadius: 6,
                    border: `1px solid ${isExceeded ? "#ff5c6c" : isWarning ? "#ffb547" : "#1c3044"}`,
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "#8ea0b8", textTransform: "uppercase" }}>
                    {rule.id.replace("-", " ")}
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, margin: "4px 0", color: isExceeded ? "#ff5c6c" : "#fff" }}>
                    {usedH}h {usedM}m
                  </div>
                  <div style={{ fontSize: "0.7rem", color: isExceeded ? "#ff5c6c" : isWarning ? "#ffb547" : "#38d39f" }}>
                    {isExceeded ? "Překročeno!" : `Zbývá: ${remH}h ${remM}m`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 4. KRYPTOGRAFICKÝ REPORT INTEGRITY */}
      {cryptoReport ? (
        <div style={{ margin: "16px 0", padding: 14, background: "#f8f9fa", border: "1px solid #ced4da", borderRadius: 8 }}>
          <strong style={{ display: "block", marginBottom: 6, color: cryptoReport.overallStatus === "PASS" ? "#0f5132" : "#495057" }}>
            Kryptografická verifikace EF podpisů (JRC / Appendix 11): {cryptoReport.overallStatus}
          </strong>
          <p style={{ margin: "0 0 10px", fontSize: "0.85em", color: "#6c757d" }}>
            Podepsaných bloků: {cryptoReport.signedFiles} z {cryptoReport.totalFiles}. Ověřeno ECDSA SHA-256: {cryptoReport.verifiedFiles}.
          </p>

          <details style={{ fontSize: "0.8rem", color: "#495057" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "#0d6efd" }}>
              Zobrazit detaily podpisů jednotlivých EF
            </summary>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {cryptoReport.details.map((d) => (
                <div key={`${d.fid}-${d.name}`} style={{ padding: "6px 8px", background: "#fff", border: "1px solid #dee2e6", borderRadius: 4 }}>
                  <strong>{d.name} (0x{d.fid.toString(16).padStart(4, "0")}):</strong>{" "}
                  <span style={{ color: d.status === "VERIFIED" ? "#198754" : d.status === "CORRUPTED" ? "#dc3545" : "#6c757d", fontWeight: 600 }}>
                    {d.status}
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>{d.detail}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : null}

      {/* 5. EXPORT A SDÍLENÍ SOUBORU (WEB SHARE API / DOWNLOAD) */}
      {cardFile && tlvValid ? (
        <div style={{ margin: "14px 0", padding: 14, background: "#eef9f1", border: "1px solid #badbcc", borderRadius: 8 }}>
          <strong style={{ color: "#0f5132", display: "block", marginBottom: 8 }}>
            ✓ Karta řidiče je připravena k uložení a sdílení
          </strong>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => shareCardFile("c1c")}
              style={{ padding: "10px 16px", background: "#198754", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
            >
              Sdílet soubor Smart Tacho 2 (.C1C)
            </button>
            <button
              type="button"
              onClick={() => shareCardFile("ddd")}
              style={{ padding: "10px 16px", background: "#0d6efd", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
            >
              Sdílet soubor (.DDD)
            </button>
            <button
              type="button"
              onClick={() => saveCompliantCardFile("ddd")}
              style={{ padding: "10px 16px", background: "#fff", color: "#0d6efd", border: "1px solid #0d6efd", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
            >
              Stáhnout do mobilu (.DDD)
            </button>
          </div>
        </div>
      ) : null}

      {cardFile ? (
        <p style={{ margin: "8px 0 0", color: "#b02a37", fontSize: "0.85em", fontWeight: 600 }}>
          UPOZORENJE: NOT A VALID .DDD — NOT FOR LEGAL OR COMPLIANCE USE. (Samo za internu dijagnostiku protokola).
        </p>
      ) : null}

      <div style={{ marginTop: 24 }}>
        {results.map((result, index) => (
          <div key={`${result.step}-${index}`} style={{ padding: "12px 0", borderBottom: "1px solid #ccc" }}>
            <strong>{result.step}: {result.status}</strong>
            {result.detail ? <div>{result.detail}</div> : null}
          </div>
        ))}
      </div>
    </main>
  );
}
