export declare const APP_V2_GOLDEN_CARD_COMMANDS: Readonly<{
  startCommunication: readonly number[];
  startDiagnosticSession: readonly number[];
  requestUpload: readonly number[];
  cardSlot1: readonly number[];
  transferExit: readonly number[];
  stopCommunication: readonly number[];
}>;

export declare function buildAppV2GoldenAck(counter: number): readonly number[];

export declare function parseAppV2GoldenDdp(message: ArrayLike<number>): Readonly<Record<string, unknown>>;
export declare function classifyAppV2GoldenResponse(
  message: ArrayLike<number>,
  requestSid: number,
  trep?: number | null,
): Readonly<Record<string, unknown>>;

export declare function createAppV2GoldenCardAssembler(): Readonly<{
  push(message: ArrayLike<number>): Readonly<Record<string, unknown>>;
}>;

export declare function validateAppV2GoldenCardTlv(
  payload: ArrayBuffer | ArrayBufferView,
): Readonly<{
  valid: boolean;
  count: number;
  reason: string | null;
}>;
