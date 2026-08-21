export interface DdpRunnerTransport {
  send(message: readonly number[]): Promise<void>;
  receive(timeoutMs: number): Promise<readonly number[] | null>;
  disconnect(): Promise<void>;
}

export interface DdpRunnerResult {
  readonly status: "complete" | "failed";
  readonly cardData: readonly number[] | null;
  readonly teardown: Readonly<{ transferExitConfirmed: boolean; stopConfirmed: boolean }>;
  readonly failure: Readonly<{ code: string; phase: string; detail: unknown }> | null;
}

export function runDdpCardDownload(
  transport: DdpRunnerTransport,
  options?: Partial<{ p2Ms: number; pendingMs: number; p3Ms: number; maxAttempts: number; maxPending: number }>,
): Promise<DdpRunnerResult>;

export class DdpRunnerError extends Error {
  readonly code: string;
  readonly phase: string;
  readonly detail: unknown;
}
