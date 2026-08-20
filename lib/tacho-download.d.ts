export const DDP_START_COMMUNICATION_REQUEST: readonly number[];
export const DDP_STOP_COMMUNICATION_REQUEST: readonly number[];
export function classifyDdpPacket(packet: readonly number[] | null | undefined, requestSid: number): Readonly<{
  framed: boolean;
  checksumValid: boolean;
  sid: number | null;
  positive: boolean;
  negative: boolean;
  negativeResponseCode: number | null;
}>;
