"use client";

import { useState } from "react";
import {
  TACHO_DIAGNOSTICS_CREDITS_UUID,
  TACHO_DIAGNOSTICS_FIFO_UUID,
  TACHO_DIAGNOSTICS_SERVICE_UUID,
  TACHO_OPTIONAL_SERVICE_UUIDS,
} from "../../lib/tacho-ble.js";
import { buildOpenRhmiStartRequest, buildOpenRhmiStatusRequest, classifyOpenRhmiPacket, describeRhmiStatus } from "../../lib/tacho-rhmi.js";

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

const APP_VERSION = "0.18-rhmi-f211-credit-sequence";
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
      const diagnostics = services.find((service) => service.uuid.toLowerCase() === TACHO_DIAGNOSTICS_SERVICE_UUID);
      if (!diagnostics) throw new Error("Diagnostics servis nije pronađen");
      const chars = await diagnostics.getCharacteristics();
      const fifo = chars.find((item) => item.uuid.toLowerCase() === TACHO_DIAGNOSTICS_FIFO_UUID);
      const credits = chars.find((item) => item.uuid.toLowerCase() === TACHO_DIAGNOSTICS_CREDITS_UUID);
      if (!fifo || !credits) throw new Error("FIFO/Credits nisu pronađeni");
      let fifoWaiter: ((bytes: number[]) => boolean) | null = null;
      fifo.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BleCharacteristic | null)?.value;
        if (!view?.byteLength || !fifoWaiter) return;
        const bytes = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        if (fifoWaiter(bytes)) fifoWaiter = null;
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
      add("Transport", "PASS", "Diagnostics FIFO + Credits + handshake");

      const exchange = async (payload: readonly number[], accepts: (packet: number[]) => boolean, timeout = 5000, grantResponseCredit = true) => {
        if (grantResponseCredit) await write(credits, [1]);
        const response = new Promise<number[]>((resolve) => {
          fifoWaiter = (packet) => {
            if (!accepts(packet)) return false;
            resolve(packet);
            return true;
          };
        });
        await write(fifo, [1, 1, ...payload]);
        const packet = await Promise.race([response, sleep(timeout).then(() => null)]);
        fifoWaiter = null;
        return packet;
      };

      const tester = await exchange(
        [0x3e, 0x00],
        (packet) => packet[0] === 1 && packet[1] === 1 && (packet[2] === 0x7e || (packet[2] === 0x7f && packet[3] === 0x3e)),
        6000,
        false,
      );
      if (!tester) {
        add("TesterPresent", "TIMEOUT", "Nije primljen 0x7E/0x7F odgovor");
        return;
      }
      if (tester[2] === 0x7f) {
        add("TesterPresent", "NEGATIVE", `NRC ${tester[4] ?? "?"}`);
        return;
      }
      add("TesterPresent", "PASS", "positive 0x7E");

      const start = await exchange(
        buildOpenRhmiStartRequest(),
        (packet) => packet[0] === 1 && packet[1] === 1 && (packet[2] === 0x71 || (packet[2] === 0x7f && packet[3] === 0x31)),
        10000,
      );
      if (!start) {
        add("F211 start", "TIMEOUT", "31 01 F2 11");
        return;
      }
      const startInfo = classifyOpenRhmiPacket(start);
      add("F211 start", startInfo.responseType === "start-positive" ? "PASS" : startInfo.responseType.toUpperCase(), startInfo.negativeResponseCode === null ? startInfo.responseType : `NRC ${startInfo.negativeResponseCode}`);
      if (startInfo.responseType === "negative") return;

      for (let poll = 1; poll <= 10; poll += 1) {
        await sleep(poll === 1 ? 250 : 1000);
        const status = await exchange(
          buildOpenRhmiStatusRequest(),
          (packet) => packet[0] === 1 && packet[1] === 1 && (packet[2] === 0x71 || (packet[2] === 0x7f && packet[3] === 0x31)),
          5000,
        );
        if (!status) {
          add(`F211 status #${poll}`, "TIMEOUT");
          continue;
        }
        const info = classifyOpenRhmiPacket(status);
        if (info.responseType === "status-positive") {
          const name = describeRhmiStatus(info.statusCode);
          add(`F211 status #${poll}`, "PASS", `${info.statusCode === null ? "?" : `0x${info.statusCode.toString(16).padStart(2, "0")}`} ${name}`);
          if (name === "open" || name === "user-rejected" || name === "local-hmi-in-use" || name === "conditions-not-met") break;
        } else {
          add(`F211 status #${poll}`, info.responseType.toUpperCase(), info.negativeResponseCode === null ? info.responseType : `NRC ${info.negativeResponseCode}`);
          break;
        }
      }
    } catch (error) {
      add("Greška", "FAIL", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify({ schema: "tachocommand-rhmi-field-test-v2", appVersion: APP_VERSION, createdAt: new Date().toISOString(), deviceName, results, privacy: "No driver data, VIN, registration, location, card number, or raw tachograph packets are retained." }, null, 2));
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>TachoCommand — RHMI Field Test</h1>
      <p><strong>Verzija:</strong> {APP_VERSION}</p>
      <p>Izolovani test. Ne čita karticu i ne šalje 0x10 0x7E. Testira samo BLE transport, TesterPresent i Remote HMI F211.</p>
      <p><strong>Uređaj:</strong> {deviceName}</p>
      <button type="button" onClick={run} disabled={running} style={{ padding: "12px 18px", marginRight: 12 }}>{running ? "Test u toku…" : "Pokreni RHMI test"}</button>
      <button type="button" onClick={copy} disabled={results.length === 0} style={{ padding: "12px 18px" }}>Kopiraj rezultat</button>
      <div style={{ marginTop: 24 }}>
        {results.map((result, index) => <div key={`${result.step}-${index}`} style={{ padding: "12px 0", borderBottom: "1px solid #ccc" }}><strong>{result.step}: {result.status}</strong>{result.detail ? <div>{result.detail}</div> : null}</div>)}
      </div>
    </main>
  );
}
