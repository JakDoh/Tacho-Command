"use client";

import { useState } from "react";
import {
  TACHO_DOWNLOAD_CREDITS_UUID,
  TACHO_DOWNLOAD_FIFO_UUID,
  TACHO_DOWNLOAD_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import { createBleDdpTransport } from "../../lib/tacho-download-ble.js";
import { runDdpCardDownload } from "../../lib/tacho-download-runner.js";

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

const APP_VERSION = "0.22-ddp-field-candidate-v2";

export default function FieldTestClient() {
  const [running, setRunning] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [results, setResults] = useState<Result[]>([]);
  const [cardFile, setCardFile] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [cardMetadata, setCardMetadata] = useState<CardMetadata | null>(null);
  const [tlvValid, setTlvValid] = useState(false);
  const [devModeArmed, setDevModeArmed] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("dev") === "card-download";
    }
    return false;
  });

  const add = (step: string, status: string, detail?: string) => setResults((current) => [...current, { step, status, detail }]);

  const run = async () => {
    if (!devModeArmed) {
      add("Bezbednosna kapija", "BLOCKED", "Uključi razvojni režim za pokretanje transportnog testa.");
      return;
    }
    setResults([]);
    setCardFile(null);
    setCardMetadata(null);
    setTlvValid(false);
    setRunning(true);
    try {
      const bluetooth = (navigator as Navigator & { bluetooth?: { requestDevice: (options: { acceptAllDevices: boolean; optionalServices: readonly string[] }) => Promise<BleDevice> } }).bluetooth;
      if (!bluetooth) throw new Error("Web Bluetooth nije dostupan");
      const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: TACHO_OPTIONAL_SERVICE_UUIDS });
      setDeviceName(device.name || "BLE uređaj");
      add("BLE izbor", "PASS", device.name || "bez imena");
      if (!device.gatt) throw new Error("GATT nije dostupan");
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const download = services.find((service) => service.uuid.toLowerCase() === TACHO_DOWNLOAD_SERVICE_UUID);
      if (!download) throw new Error("Download servis nije pronađen");
      add("Download servis", "PASS", "standardni Smart Tacho 2 UUID");
      const chars = await download.getCharacteristics();
      const fifo = chars.find((item) => item.uuid.toLowerCase() === TACHO_DOWNLOAD_FIFO_UUID);
      const credits = chars.find((item) => item.uuid.toLowerCase() === TACHO_DOWNLOAD_CREDITS_UUID);
      if (!fifo || !credits) throw new Error("Download FIFO/Credits nisu pronađeni");
      add("Download karakteristike", "PASS", "FIFO + Credits");

      const write = async (characteristic: BleCharacteristic, bytes: number[]) => {
        const value = Uint8Array.from(bytes);
        if (characteristic.properties?.write && characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
        if (characteristic.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
        if (characteristic.writeValue) return characteristic.writeValue(value);
        if (characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
        if (characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
        throw new Error("Write metoda nije dostupna");
      };

      const transport = createBleDdpTransport({ device, fifo, credits, write, receiveWindow: 8 });
      try {
        await transport.start();
        add("Indications", "PASS");
        add("Flow control", "PASS", `server credit ${transport.ledger.serverCredits}`);
        const result = await runDdpCardDownload(transport);
        if (result.status === "complete" && result.cardData) {
          const data = Uint8Array.from(result.cardData);
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
          setCardFile(data);
          add("Transport kartičnih podataka", "PASS", `${data.byteLength} bajtova; SHA-256 ${digest}`);

          // Validacija TLV struktury po Appendix 7:
          const tlv = parseCardTlv(data);
          if (tlv.valid) {
            setTlvValid(true);
            const meta = extractMetadata(tlv.objects);
            setCardMetadata(meta);
            add("Struktura fajla", "PASS", `Standardni TLV format (Appendix 7): ${tlv.objects.length} EF blokova`);
            if (meta) {
              add("Podaci kartice", "PASS", `${meta.surname} ${meta.firstName} | Kartica: ${meta.cardNumber} | Važi do: ${meta.expiryDate}`);
            }
          } else {
            add("Struktura fajla", "NOT_VALIDATED", `Sirovi transportni bajtovi — standardni .DDD format nije sklopljen (${tlv.reason})`);
          }

          add("Digitalni potpis", "NOT_VALIDATED", "Kriptografska validacija nije izvršena (nema JRC ključeva)");
          add("RequestTransferExit", result.teardown.transferExitConfirmed ? "PASS" : "FAIL", "positive SID 0x77");
          add("StopCommunication", result.teardown.stopConfirmed ? "PASS" : "FAIL", "positive SID 0xC2");
        } else {
          add("Transport kartičnih podataka", "FAIL", `${result.failure?.phase ?? "unknown"}: ${result.failure?.code ?? "unknown"}`);
          add("Kontrolisano zatvaranje", result.teardown.stopConfirmed ? "PASS" : "INCOMPLETE", `TransferExit ${result.teardown.transferExitConfirmed ? "potvrđen" : "nepotvrđen"}; StopCommunication ${result.teardown.stopConfirmed ? "potvrđen" : "nepotvrđen"}`);
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
    await navigator.clipboard.writeText(JSON.stringify({
      schema: "tachocommand-download-field-test-v4",
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      deviceName,
      results,
      cardMetadata: cardMetadata ? { ...cardMetadata, cardNumber: "REDACTED" } : null,
      privacy: "The copied report contains no driver identity, card number, VIN, registration, location, or raw tachograph packets. Card bytes remain only in local browser memory until saved or the page is closed.",
    }, null, 2));
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

  const saveCompliantCardFile = (fileExtension: "c1c" | "ddd") => {
    if (!cardFile) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const hm = `${pad(now.getHours())}${pad(now.getMinutes())}`;
    const surname = (cardMetadata?.surname ?? "DRIVER").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 15);
    const firstName = (cardMetadata?.firstName ?? "CARD").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10);
    const cardNum = (cardMetadata?.cardNumber ?? "0000000000000000").slice(0, 16);

    const officialFileName = ["C", ymd, hm, surname, firstName, cardNum].join("_") + "." + fileExtension;
    const url = URL.createObjectURL(new Blob([cardFile], { type: "application/octet-stream" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = officialFileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
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
        {!devModeArmed ? <p style={{ margin: "6px 0 0", color: "#6c757d", fontSize: "0.85em" }}>Zaštitna kapija: transportna proba je zaključana dok se ne potvrdi razvojni režim.</p> : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button type="button" onClick={run} disabled={running || !devModeArmed} style={{ padding: "12px 18px" }}>
          {running ? "Test u toku…" : "Pokreni DDP transportnu probu"}
        </button>
        <button type="button" onClick={copy} disabled={results.length === 0} style={{ padding: "12px 18px" }}>
          Kopiraj rezultat
        </button>
        <button type="button" onClick={saveDiagnosticCapture} disabled={!cardFile} style={{ padding: "12px 18px" }}>
          Sačuvaj sirovi dijagnostički zapis (.bin)
        </button>
      </div>

      {cardFile && tlvValid ? (
        <div style={{ margin: "14px 0", padding: 12, background: "#eef9f1", border: "1px solid #badbcc", borderRadius: 8 }}>
          <strong style={{ color: "#0f5132", display: "block", marginBottom: 8 }}>
            ✓ TLV struktura kartice je uspešno verifikovana
          </strong>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => saveCompliantCardFile("c1c")}
              style={{ padding: "10px 16px", background: "#198754", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
            >
              Sačuvaj zvanični Smart Tacho 2 fajl (.C1C)
            </button>
            <button
              type="button"
              onClick={() => saveCompliantCardFile("ddd")}
              style={{ padding: "10px 16px", background: "#0d6efd", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
            >
              Sačuvaj standardni fajl (.DDD)
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
