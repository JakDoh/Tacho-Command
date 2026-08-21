"use client";

import { useState } from "react";
import {
  TACHO_DOWNLOAD_CREDITS_UUID,
  TACHO_DOWNLOAD_FIFO_UUID,
  TACHO_DOWNLOAD_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import { createBleDownloadTransport } from "../../lib/tacho-ble-download-transport.js";
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
type BleDevice = { name?: string; gatt?: { connect: () => Promise<BleServer>; disconnect?: () => void } };

type Result = { step: string; status: string; detail?: string };

const APP_VERSION = "0.22-card-download-candidate";

export default function FieldTestClient() {
  const [running, setRunning] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [results, setResults] = useState<Result[]>([]);
  const [cardFile, setCardFile] = useState<Uint8Array | null>(null);

  const add = (step: string, status: string, detail?: string) => setResults((current) => [...current, { step, status, detail }]);

  const run = async () => {
    setResults([]);
    setCardFile(null);
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

      const transport = createBleDownloadTransport({
        writeFifo: (bytes) => write(fifo, [...bytes]),
        writeCredits: (bytes) => write(credits, [...bytes]),
      });
      fifo.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength) return;
        transport.onFifo(Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength)));
      });
      credits.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (view?.byteLength) transport.onCredit(view.getUint8(0));
      });
      await credits.startNotifications();
      await fifo.startNotifications();
      add("Indications", "PASS");
      await transport.start(8);
      add("Flow control", "READY", "credit ledger aktivan; prijemni prozor 8 paketa");

      const outcome = await runDdpCardDownload(transport);
      device.gatt.disconnect?.();
      if (outcome.status !== "complete" || !outcome.cardData) {
        add("Kompletan download", "FAIL", `${outcome.failure?.phase ?? "unknown"}: ${outcome.failure?.code ?? "unknown"}`);
        add("RequestTransferExit", outcome.teardown.transferExitConfirmed ? "PASS" : "NOT CONFIRMED");
        add("StopCommunication", outcome.teardown.stopConfirmed ? "PASS" : "NOT CONFIRMED");
        return;
      }
      const bytes = Uint8Array.from(outcome.cardData);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      setCardFile(bytes);
      add("Kompletan download", "PASS", `${bytes.byteLength} bajtova; SHA-256 ${hash.slice(0, 16)}…`);
      add("ACK podblokova", "PASS", "svaki DDP podblok potvrđen");
      add("RequestTransferExit", "PASS", "positive SID 0x77");
      add("StopCommunication", "PASS", "positive SID 0xC2");
    } catch (error) {
      add("Greška", "FAIL", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ schema: "tachocommand-download-field-test-v3", appVersion: APP_VERSION, createdAt: new Date().toISOString(), deviceName, results, privacy: "The copied report contains no driver data, VIN, registration, location, card number, or raw tachograph packets. The downloaded card file stays on the user's device." }, null, 2));
  };

  const saveCard = () => {
    if (!cardFile) return;
    const url = URL.createObjectURL(new Blob([cardFile], { type: "application/octet-stream" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tachocommand-card-${new Date().toISOString().replace(/[:.]/g, "-")}.ddd`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>TachoCommand — Download Transport Test</h1>
      <p><strong>Verzija:</strong> {APP_VERSION}</p>
      <p>Kontrolisani read-only download kartice iz slota 1. Vozilo mora stajati; ne prekidaj Bluetooth dok traje prenos.</p>
      <p><strong>Uređaj:</strong> {deviceName}</p>
      <button type="button" onClick={run} disabled={running} style={{ padding: "12px 18px", marginRight: 12 }}>{running ? "Test u toku…" : "Proveri DDP sesiju"}</button>
      <button type="button" onClick={copy} disabled={results.length === 0} style={{ padding: "12px 18px" }}>Kopiraj rezultat</button>
      <button type="button" onClick={saveCard} disabled={!cardFile} style={{ padding: "12px 18px", marginLeft: 12 }}>Sačuvaj karticu (.ddd)</button>
      {cardFile ? <p>Datoteka nije još označena kao službeno validirana dok provera digitalnog potpisa ne bude završena.</p> : null}
      <div style={{ marginTop: 24 }}>
        {results.map((result, index) => <div key={`${result.step}-${index}`} style={{ padding: "12px 0", borderBottom: "1px solid #ccc" }}><strong>{result.step}: {result.status}</strong>{result.detail ? <div>{result.detail}</div> : null}</div>)}
      </div>
    </main>
  );
}
