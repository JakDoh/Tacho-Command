export const DDP_START_COMMUNICATION_REQUEST: readonly number[];
export const DDP_START_DIAGNOSTIC_SESSION_REQUEST: readonly number[];
export const DDP_REQUEST_UPLOAD: readonly number[];
export const DDP_REQUEST_OVERVIEW: readonly number[];
export const DDP_REQUEST_DRIVER_CARD_SLOT_1: readonly number[];
export const DDP_REQUEST_TRANSFER_EXIT: readonly number[];
export const DDP_STOP_COMMUNICATION_REQUEST: readonly number[];
export const DDP_PHASES: readonly Readonly<Record<string, unknown>>[];
export function createDdpSession(): Readonly<{ phaseIndex: number; status: string; failure: null }>;
export function advanceDdpSession(session: Readonly<Record<string, any>>, event: Readonly<Record<string, any>>): Readonly<Record<string, any>>;
export function getDdpTeardownMessages(session: Readonly<Record<string, any>>): readonly (readonly number[])[];
export function classifyDdpPacket(packet: readonly number[] | null | undefined, requestSid: number): Readonly<{
  framed: boolean;
  checksumValid: boolean;
  sid: number | null;
  positive: boolean;
  negative: boolean;
  negativeResponseCode: number | null;
}>;
