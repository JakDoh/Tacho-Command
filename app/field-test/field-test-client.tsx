"use client";

import { useState } from "react";
import {
  TACHO_DOWNLOAD_CREDITS_UUID,
  TACHO_DOWNLOAD_FIFO_UUID,
  TACHO_DOWNLOAD_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import { DDP_START_COMMUNICATION_REQUEST, DDP_STOP_COMMUNICATION_REQUEST, classifyDdpPacket } from "../../lib/tacho-download.js";

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

const APP_VERSION = "0.20-ddp-session-probe";
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function FieldTestClient() {
  const [running, setRunning] = useState(false);
  const [deviceName, setDeviceName] = useState("—");
  const [results, setResults] = useState<Result[]>([]);

  const add = (step: string, status: string, detail?: string) => setResults((current) => [...current, { step, status, detail }]);

  const run = async () => {
    setResults([]);
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

      let fifoWaiter: ((packet: number[]) => boolean) | null = null;
      fifo.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength || !fifoWaiter) return;
        const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        if (fifoWaiter(packet)) fifoWaiter = null;
      });

      let creditWaiter: ((credit: number) => void) | null = null;
      credits.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength || !creditWaiter) return;
        const resolve = creditWaiter;
        creditWaiter = null;
        resolve(view.getUint8(0));
      });
      await credits.startNotifications();
      await fifo.startNotifications();
      add("Indications", "PASS");

      const write = async (characteristic: BleCharacteristic, bytes: number[]) => {
        const value = Uint8Array.from(bytes);
        if (characteristic.properties?.write && characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
        if (characteristic.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
        if (characteristic.writeValue) return characteristic.writeValue(value);
        if (characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(value);
        if (characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(value);
        throw new Error("Write metoda nije dostupna");
      };

      const serverCredit = new Promise<number>((resolve) => { creditWaiter = resolve; });
      await write(credits, [1]);
      const granted = await Promise.race([serverCredit, sleep(4000).then(() => null)]);
      creditWaiter = null;
      if (granted === null) throw new Error("Server credit nije stigao");
      if (granted === 0xff) throw new Error("DTCO je odbio flow control");
      add("Flow control", "PASS", `server credit ${granted}`);
      add("Download transport", "READY", "Handshake potvrđen");

      const exchange = async (message: readonly number[], requestSid: number, grantResponseCredit: boolean) => {
        if (grantResponseCredit) await write(credits, [1]);
        const response = new Promise<number[]>((resolve) => {
          fifoWaiter = (packet) => {
            const info = classifyDdpPacket(packet, requestSid);
            if (!info.positive && !info.negative) return false;
            resolve(packet);
            return true;
          };
        });
        await write(fifo, [1, 1, ...message]);
        const packet = await Promise.race([response, sleep(6000).then(() => null)]);
        fifoWaiter = null;
        return packet ? classifyDdpPacket(packet, requestSid) : null;
      };

      const opened = await exchange(DDP_START_COMMUNICATION_REQUEST, 0x81, false);
      if (!opened) {
        add("DDP StartCommunication", "TIMEOUT", "SID 0x81");
        return;
      }
      if (opened.negative) {
        add("DDP StartCommunication", "NEGATIVE", `NRC ${opened.negativeResponseCode ?? "?"}`);
        return;
      }
      add("DDP StartCommunication", "PASS", "positive SID 0xC1; key bytes EA 8F");

      const closed = await exchange(DDP_STOP_COMMUNICATION_REQUEST, 0x82, true);
      if (!closed) add("DDP StopCommunication", "TIMEOUT", "SID 0x82");
      else if (closed.negative) add("DDP StopCommunication", "NEGATIVE", `NRC ${closed.negativeResponseCode ?? "?"}`);
      else add("DDP StopCommunication", "PASS", "positive SID 0xC2");
    } catch (error) {
      add("Greška", "FAIL", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ schema: "tachocommand-download-field-test-v2", appVersion: APP_VERSION, createdAt: new Date().toISOString(), deviceName, results, privacy: "No driver data, VIN, registration, location, card number, or raw tachograph packets are requested or retained." }, null, 2));
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>TachoCommand — Download Transport Test</h1>
      <p><strong>Verzija:</strong> {APP_VERSION}</p>
      <p>Izolovani read-only korak. Otvara i uredno zatvara dokumentovanu DDP komunikacionu sesiju bez zahteva za kartične podatke.</p>
      <p><strong>Uređaj:</strong> {deviceName}</p>
      <button type="button" onClick={run} disabled={running} style={{ padding: "12px 18px", marginRight: 12 }}>{running ? "Test u toku…" : "Proveri DDP sesiju"}</button>
      <button type="button" onClick={copy} disabled={results.length === 0} style={{ padding: "12px 18px" }}>Kopiraj rezultat</button>
      <div style={{ marginTop: 24 }}>
        {results.map((result, index) => <div key={`${result.step}-${index}`} style={{ padding: "12px 0", borderBottom: "1px solid #ccc" }}><strong>{result.step}: {result.status}</strong>{result.detail ? <div>{result.detail}</div> : null}</div>)}
      </div>
    </main>
  );
}
