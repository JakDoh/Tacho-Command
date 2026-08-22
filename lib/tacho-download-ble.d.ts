type BleCharacteristic = {
  value?: DataView | null;
  startNotifications(): Promise<unknown>;
  addEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void;
};

export function createBleDdpTransport(input: {
  device?: {
    addEventListener?(type: string, listener: () => void): void;
    removeEventListener?(type: string, listener: () => void): void;
  };
  fifo: BleCharacteristic;
  credits: BleCharacteristic;
  write(characteristic: BleCharacteristic, bytes: number[]): Promise<void>;
  receiveWindow?: number;
  mtuPayload?: number;
  creditTimeoutMs?: number;
}): Readonly<{
  ledger: { serverCredits: number; clientCredits: number; closed: boolean; failure: string | null };
  start(): Promise<void>;
  send(message: readonly number[]): Promise<void>;
  receive(timeoutMs: number): Promise<readonly number[] | null>;
  disconnect(): Promise<void>;
}>;
