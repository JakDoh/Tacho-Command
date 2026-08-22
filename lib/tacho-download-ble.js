import {
  consumeClientCredit,
  consumeServerCredit,
  createBleCreditLedger,
  createItsMessageAssembler,
  grantClientCredits,
  pushItsPacket,
  receiveServerCredits,
} from "./tacho-download.js";

const timeout = (ms, value = null) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export function createBleDdpTransport(input) {
  const ledger = createBleCreditLedger();
  const assembler = createItsMessageAssembler();
  const messages = [];
  const messageWaiters = [];
  const creditWaiters = [];
  const receiveWindow = Math.min(254, Math.max(1, Math.floor(input.receiveWindow ?? 8)));
  const mtuPayload = Math.min(253, Math.max(1, Math.floor(input.mtuPayload ?? 18)));
  const creditTimeoutMs = Math.max(1, Math.floor(input.creditTimeoutMs ?? 4000));
  let started = false;
  let closed = false;
  let disconnectSent = false;
  let creditWriteChain = Promise.resolve();

  const deliverMessage = (message) => {
    const waiter = messageWaiters.shift();
    if (waiter) waiter(message);
    else messages.push(message);
  };

  const wakeCredits = () => {
    while (ledger.serverCredits > 0 && creditWaiters.length) creditWaiters.shift()(true);
  };

  const onCredit = (event) => {
    const view = event.target?.value;
    if (!view?.byteLength) return;
    const result = receiveServerCredits(ledger, view.getUint8(0));
    if (result.reason === "peer-disconnect") {
      closed = true;
      disconnectSent = true;
      while (messageWaiters.length) messageWaiters.shift()(null);
      while (creditWaiters.length) creditWaiters.shift()(false);
      return;
    }
    wakeCredits();
  };

  const replenishCredit = () => {
    creditWriteChain = creditWriteChain.then(async () => {
      if (closed) return;
      await input.write(input.credits, [1]);
      grantClientCredits(ledger, 1);
    });
  };

  const onFifo = (event) => {
    const view = event.target?.value;
    if (!view?.byteLength || closed) return;
    if (!consumeClientCredit(ledger).accepted) {
      closed = true;
      while (messageWaiters.length) messageWaiters.shift()(null);
      return;
    }
    const packet = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    const result = pushItsPacket(assembler, packet);
    replenishCredit();
    if (result.status === "complete") deliverMessage(result.message);
  };

  const waitForServerCredit = async () => {
    if (closed) throw new Error("BLE DDP transport is closed");
    if (ledger.serverCredits > 0) return;
    let resolveWaiter;
    const available = await Promise.race([
      new Promise((resolve) => {
        resolveWaiter = resolve;
        creditWaiters.push(resolve);
      }),
      timeout(creditTimeoutMs, false),
    ]);
    if (!available) {
      const index = creditWaiters.indexOf(resolveWaiter);
      if (index >= 0) creditWaiters.splice(index, 1);
    }
    if (!available || ledger.serverCredits < 1) throw new Error("BLE server credit timeout");
  };

  const onGattDisconnected = () => {
    closed = true;
    ledger.closed = true;
    ledger.failure = "gatt-disconnected";
    while (messageWaiters.length) messageWaiters.shift()(null);
    while (creditWaiters.length) creditWaiters.shift()(false);
  };

  return Object.freeze({
    ledger,
    async start() {
      if (started) return;
      started = true;
      if (input.device?.addEventListener) {
        input.device.addEventListener("gattserverdisconnected", onGattDisconnected);
      }
      input.credits.addEventListener("characteristicvaluechanged", onCredit);
      input.fifo.addEventListener("characteristicvaluechanged", onFifo);
      await input.credits.startNotifications();
      await input.fifo.startNotifications();
      await input.write(input.credits, [receiveWindow]);
      grantClientCredits(ledger, receiveWindow);
      await waitForServerCredit();
    },
    async send(message) {
      if (!started) throw new Error("BLE DDP transport is not started");
      const bytes = Array.from(message ?? []);
      const chunks = [];
      for (let offset = 0; offset < bytes.length; offset += mtuPayload) chunks.push(bytes.slice(offset, offset + mtuPayload));
      if (chunks.length < 1 || chunks.length > 0xfe) throw new Error("Invalid BLE DDP message length");
      for (let index = 0; index < chunks.length; index += 1) {
        await waitForServerCredit();
        if (!consumeServerCredit(ledger).accepted) throw new Error("BLE server credit exhausted");
        await input.write(input.fifo, [index === 0 ? chunks.length : 0, index + 1, ...chunks[index]]);
      }
    },
    async receive(timeoutMs) {
      if (messages.length) return messages.shift();
      if (closed) return null;
      let resolveWaiter;
      const pending = new Promise((resolve) => {
        resolveWaiter = resolve;
        messageWaiters.push(resolve);
      });
      const result = await Promise.race([pending, timeout(timeoutMs, null)]);
      if (result === null) {
        const index = messageWaiters.indexOf(resolveWaiter);
        if (index >= 0) messageWaiters.splice(index, 1);
      }
      return result;
    },
    async disconnect() {
      if (disconnectSent) return;
      if (input.device?.removeEventListener) {
        input.device.removeEventListener("gattserverdisconnected", onGattDisconnected);
      }
      await creditWriteChain;
      try { await input.write(input.credits, [0xff]); } catch {}
      disconnectSent = true;
      closed = true;
      while (messageWaiters.length) messageWaiters.shift()(null);
      while (creditWaiters.length) creditWaiters.shift()(false);
    },
  });
}
