export type AppV2GoldenCardTransportResult = Readonly<{
  payload: Uint8Array;
  submessages: number;
  byteLength: number;
  tlvCount: number;
  transportCandidate: "golden-compatible-0.32c";
  fieldProven: false;
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
