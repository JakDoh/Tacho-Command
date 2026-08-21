import {
  consumeClientCredit,
  consumeServerCredit,
  createBleCreditLedger,
  createItsMessageAssembler,
  grantClientCredits,
  pushItsPacket,
  receiveServerCredits,
} from "./tacho-download.js";

const timeoutPromise = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export function createBleDownloadTransport({ writeFifo, writeCredits, creditTimeoutMs = 6000 }) {
  const ledger = createBleCreditLedger();
  const assembler = createItsMessageAssembler();
  const messages = [];
  const messageWaiters = [];
  const creditWaiters = [];
  let creditWrites = Promise.resolve();
  let failure = null;

  const wakeCreditWaiters = () => {
    while (ledger.serverCredits > 0 && creditWaiters.length) creditWaiters.shift()(true);
  };

  const queueCreditWrite = (value) => {
    creditWrites = creditWrites.then(async () => {
      await writeCredits([value]);
      if (value !== 0xff) {
        const granted = grantClientCredits(ledger, value);
        if (!granted.accepted) throw new Error(`BLE client credit rejected: ${granted.reason}`);
      }
    });
    return creditWrites;
  };

  const deliver = (message) => {
    const waiter = messageWaiters.shift();
    if (waiter) waiter(message);
    else messages.push(message);
  };

  return Object.freeze({
    ledger,
    async start(initialCredits = 8) {
      await queueCreditWrite(initialCredits);
    },
    onCredit(value) {
      const result = receiveServerCredits(ledger, value);
      if (!result.accepted || result.reason === "peer-disconnect") failure = result.reason;
      wakeCreditWaiters();
      return result;
    },
    onFifo(packet) {
      const consumed = consumeClientCredit(ledger);
      if (!consumed.accepted) {
        failure = consumed.reason;
        return Object.freeze({ status: "invalid", reason: consumed.reason, message: null });
      }
      const result = pushItsPacket(assembler, packet);
      void queueCreditWrite(1).catch(() => { failure = "credit-write-failed"; });
      if (result.status === "complete") deliver(result.message);
      if (result.status === "invalid") failure = result.reason;
      return result;
    },
    async send(message) {
      if (failure) throw new Error(`BLE transport failed: ${failure}`);
      if (ledger.serverCredits < 1) {
        const available = new Promise((resolve) => creditWaiters.push(resolve));
        const ready = await Promise.race([available, timeoutPromise(creditTimeoutMs, false)]);
        if (!ready) throw new Error("BLE server credit timeout");
      }
      const consumed = consumeServerCredit(ledger);
      if (!consumed.accepted) throw new Error(`BLE FIFO write blocked: ${consumed.reason}`);
      await writeFifo([1, 1, ...message]);
    },
    async receive(timeoutMs) {
      if (failure) throw new Error(`BLE transport failed: ${failure}`);
      if (messages.length) return messages.shift();
      let resolveWaiter;
      const incoming = new Promise((resolve) => {
        resolveWaiter = resolve;
        messageWaiters.push(resolve);
      });
      const result = await Promise.race([incoming, timeoutPromise(timeoutMs, null)]);
      if (result === null) {
        const index = messageWaiters.indexOf(resolveWaiter);
        if (index >= 0) messageWaiters.splice(index, 1);
      }
      return result;
    },
    async disconnect() {
      try {
        await creditWrites;
        await writeCredits([0xff]);
      } finally {
        ledger.closed = true;
        while (messageWaiters.length) messageWaiters.shift()(null);
        while (creditWaiters.length) creditWaiters.shift()(false);
      }
    },
  });
}
