export type AppV2GoldenCardTransportResult = Readonly<{
  payload: Uint8Array;
  submessages: number;
  byteLength: number;
  tlvCount: number;
  transport: "golden-0.32c";
  fieldProven: true;
  fieldProofScope: "VDO-DTCO-4.1a-Android-Chrome-Slot1-2026-09-19";
}>;

export declare function readAppV2GoldenCardPayload(input?: Readonly<{
  bluetooth?: {
    requestDevice: (options: unknown) => Promise<unknown>;
  } | null;
  requestTimeoutMs?: number;
  cardIdleTimeoutMs?: number;
  p3GuardMs?: number;
}>): Promise<AppV2GoldenCardTransportResult>;

export declare function readBrowserAppV2GoldenCardPayload(
  options?: Readonly<{
    requestTimeoutMs?: number;
    cardIdleTimeoutMs?: number;
    p3GuardMs?: number;
  }>,
): Promise<AppV2GoldenCardTransportResult>;
