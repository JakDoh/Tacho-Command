export const DDP_START_COMMUNICATION_REQUEST: readonly number[];
export const DDP_START_DIAGNOSTIC_SESSION_REQUEST: readonly number[];
export const DDP_REQUEST_UPLOAD: readonly number[];
export const DDP_REQUEST_OVERVIEW: readonly number[];
export const DDP_REQUEST_OVERVIEW_GEN2: readonly number[];
export const DDP_REQUEST_DRIVER_CARD_SLOT_1: readonly number[];
export const DDP_REQUEST_TRANSFER_EXIT: readonly number[];
export const DDP_STOP_COMMUNICATION_REQUEST: readonly number[];
export const DDP_PHASES: readonly Readonly<Record<string, unknown>>[];
export interface DdpSession {
  readonly phaseIndex: number;
  readonly status: string;
  readonly failure: Readonly<{ phase: string; type: string; code: number | null }> | null;
}
export function createItsMessageAssembler(): { expectedPackets: number; nextPacket: number; chunks: number[][] };
export function pushItsPacket(assembler: { expectedPackets: number; nextPacket: number; chunks: number[][] }, packet: readonly number[]): Readonly<{ status: string; reason: string | null; message: readonly number[] | null }>;
export function parseDdpMessage(message: readonly number[]): Readonly<{ valid: boolean; reason: string | null; sid: number | null; data: readonly number[] }>;
export function createBleCreditLedger(): { serverCredits: number; clientCredits: number; closed: boolean; failure: string | null };
export function receiveServerCredits(ledger: ReturnType<typeof createBleCreditLedger>, value: number): Readonly<{ accepted: boolean; reason: string | null }>;
export function consumeServerCredit(ledger: ReturnType<typeof createBleCreditLedger>): Readonly<{ accepted: boolean; reason: string | null }>;
export function grantClientCredits(ledger: ReturnType<typeof createBleCreditLedger>, value: number): Readonly<{ accepted: boolean; reason: string | null }>;
export function consumeClientCredit(ledger: ReturnType<typeof createBleCreditLedger>): Readonly<{ accepted: boolean; reason: string | null }>;
export function buildDdpSubMessageAck(counter: number): readonly number[];
export const DDP_ABORT_SUB_MESSAGES: readonly number[];
export function createDdpTransferAssembler(trep: number): { trep: number; expectedCounter: number; chunks: readonly number[][]; complete: boolean };
export function pushDdpSubMessage(assembler: ReturnType<typeof createDdpTransferAssembler>, message: readonly number[]): Readonly<{ status: string; reason: string | null; ack: readonly number[] | null; payload: readonly number[] | null }>;
export function createDdpSession(): Readonly<DdpSession>;
export function advanceDdpSession(session: Readonly<DdpSession>, event: Readonly<Record<string, unknown>>): Readonly<DdpSession>;
export function getDdpTeardownMessages(session: Readonly<DdpSession>): readonly (readonly number[])[];
export interface DdpTeardown {
  readonly phase: string;
  readonly attempts: number;
  readonly status: string;
  readonly transferExitConfirmed: boolean;
  readonly stopConfirmed: boolean;
}
export function createDdpTeardown(session: Readonly<DdpSession>): Readonly<DdpTeardown>;
export function getDdpTeardownMessage(teardown: Readonly<DdpTeardown>): readonly number[] | null;
export function advanceDdpTeardown(teardown: Readonly<DdpTeardown>, event: Readonly<Record<string, unknown>>): Readonly<DdpTeardown>;
export function classifyDdpPacket(packet: readonly number[] | null | undefined, requestSid: number): Readonly<{
  framed: boolean;
  checksumValid: boolean;
  sid: number | null;
  positive: boolean;
  negative: boolean;
  responsePending: boolean;
  negativeResponseCode: number | null;
}>;
