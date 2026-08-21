export interface BleDownloadTransport {
  readonly ledger: { serverCredits: number; clientCredits: number; closed: boolean; failure: string | null };
  start(initialCredits?: number): Promise<void>;
  onCredit(value: number): Readonly<{ accepted: boolean; reason: string | null }>;
  onFifo(packet: readonly number[]): Readonly<{ status: string; reason: string | null; message: readonly number[] | null }>;
  send(message: readonly number[]): Promise<void>;
  receive(timeoutMs: number): Promise<readonly number[] | null>;
  disconnect(): Promise<void>;
}

export function createBleDownloadTransport(input: {
  writeFifo(bytes: readonly number[]): Promise<void>;
  writeCredits(bytes: readonly number[]): Promise<void>;
  creditTimeoutMs?: number;
}): BleDownloadTransport;
