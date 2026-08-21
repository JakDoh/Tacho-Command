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
type BleDevice = { name?: string; gatt?: { connect: () => Promise<BleServer> } };

type Result = { step: string; status: string; detail?: string };

const APP_VERSION = "0.22-complete-card-download-rc";

export default function FieldTestClient() {
  const [running, setRunning] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [results, setResults] = useState<Result[]>([]);
  const [cardFile, setCardFile] = useState<Uint8Array<ArrayBuffer> | null>(null);

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

      const transport = createBleDdpTransport({ fifo, credits, write, receiveWindow: 8 });
      try {
        await transport.start();
        add("Indications", "PASS");
        add("Flow control", "PASS", `server credit ${transport.ledger.serverCredits}`);
        const result = await runDdpCardDownload(transport);
        if (result.status === "complete" && result.cardData) {
          const data = Uint8Array.from(result.cardData);
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
          setCardFile(data);
          add("Kompletan download kartice", "PASS", `${data.byteLength} bajtova; SHA-256 ${digest}`);
          add("RequestTransferExit", result.teardown.transferExitConfirmed ? "PASS" : "FAIL", "positive SID 0x77");
          add("StopCommunication", result.teardown.stopConfirmed ? "PASS" : "FAIL", "positive SID 0xC2");
        } else {
          add("Kompletan download kartice", "FAIL", `${result.failure?.phase ?? "unknown"}: ${result.failure?.code ?? "unknown"}`);
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
    await navigator.clipboard.writeText(JSON.stringify({ schema: "tachocommand-download-field-test-v3", appVersion: APP_VERSION, createdAt: new Date().toISOString(), deviceName, results, privacy: "The copied report contains no driver identity, card number, VIN, registration, location, or raw tachograph packets. Card bytes remain only in local browser memory until saved or the page is closed." }, null, 2));
  };

  const saveCard = () => {
    if (!cardFile) return;
    const url = URL.createObjectURL(new Blob([cardFile], { type: "application/octet-stream" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tachocommand-card-${new Date().toISOString().replace(/[:.]/g, "-")}.ddd`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>TachoCommand — Download Transport Test</h1>
      <p><strong>Verzija:</strong> {APP_VERSION}</p>
      <p>Razvojni read-only test kompletnog preuzimanja kartice iz slota 1. Vozilo mora stajati. Sesija se uvek zatvara kroz RequestTransferExit i StopCommunication.</p>
      <p><strong>Uređaj:</strong> {deviceName}</p>
      <button type="button" onClick={run} disabled={running} style={{ padding: "12px 18px", marginRight: 12 }}>{running ? "Test u toku…" : "Proveri DDP sesiju"}</button>
      <button type="button" onClick={copy} disabled={results.length === 0} style={{ padding: "12px 18px" }}>Kopiraj rezultat</button>
      <button type="button" onClick={saveCard} disabled={!cardFile} style={{ padding: "12px 18px", marginLeft: 12 }}>Sačuvaj kartični fajl</button>
      <div style={{ marginTop: 24 }}>
        {results.map((result, index) => <div key={`${result.step}-${index}`} style={{ padding: "12px 0", borderBottom: "1px solid #ccc" }}><strong>{result.step}: {result.status}</strong>{result.detail ? <div>{result.detail}</div> : null}</div>)}
      </div>
    </main>
  );
}
