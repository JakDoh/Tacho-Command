import type { CardTransportDiagnostic } from "./card-transport-diagnostic";
export type AppV2GoldenCardTransportResult = Readonly<{
  payload: Uint8Array;
  submessages: number;
  byteLength: number;
  tlvCount: number;
  transport: "golden-0.32c";
  fieldProven: true;
  fieldProofScope: "VDO-DTCO-4.1a-Android-Chrome-Slot1-2026-09-19";
}>;

export declare function selectAppV2GoldenCardDevice(input?: Readonly<{
  bluetooth?: {
    requestDevice: (options: unknown) => Promise<unknown>;
  } | null;
}>): Promise<unknown>;

export declare function selectBrowserAppV2GoldenCardDevice(): Promise<unknown>;

export declare function readAppV2GoldenCardPayload(input?: Readonly<{
  bluetooth?: {
    requestDevice: (options: unknown) => Promise<unknown>;
  } | null;
  signal?: AbortSignal;
  device?: unknown;
  disconnectOnFinish?: boolean;
  requestTimeoutMs?: number;
  firstPacketTimeoutMs?: number;
  cardIdleTimeoutMs?: number;
  p3GuardMs?: number;
    writeTimeoutMs?: number;
    operationTimeoutMs?: number;
    commandDeadlineMs?: number;
  onDiagnostic?: (value: CardTransportDiagnostic) => void;
  onProgress?: (progress: Readonly<{
    submessages: number;
    byteLength: number;
    complete: boolean;
  }>) => void;
}>): Promise<AppV2GoldenCardTransportResult>;

export declare function readBrowserAppV2GoldenCardPayload(
  options?: Readonly<{
    signal?: AbortSignal;
    device?: unknown;
    disconnectOnFinish?: boolean;
    requestTimeoutMs?: number;
    firstPacketTimeoutMs?: number;
    cardIdleTimeoutMs?: number;
    p3GuardMs?: number;
    writeTimeoutMs?: number;
    operationTimeoutMs?: number;
    commandDeadlineMs?: number;
    onDiagnostic?: (value: CardTransportDiagnostic) => void;
    onProgress?: (progress: Readonly<{
      submessages: number;
      byteLength: number;
      complete: boolean;
    }>) => void;
  }>,
): Promise<AppV2GoldenCardTransportResult>;
