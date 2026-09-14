export type UdsCollectorResult = Readonly<{
  status: "pending" | "complete" | "invalid" | "unmatched" | "ignored";
  reason: string | null;
  response: readonly number[] | null;
}>;

export type UdsResponseCollector = Readonly<{
  push(packet: readonly number[]): UdsCollectorResult;
}>;

export function udsResponseMatchesRequest(
  requestBytes?: readonly number[],
  responseBytes?: readonly number[],
): boolean;

export function createUdsResponseCollector(
  requestBytes?: readonly number[],
): UdsResponseCollector;
