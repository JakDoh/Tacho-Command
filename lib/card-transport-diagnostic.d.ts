export type CardTransportDiagnostic = Readonly<{
  stage: string;
  lastConfirmedStage: string;
  errorCode: string | null;
  elapsedMs: number;
  packets: number;
  bytes: number;
  pendingResponses: number;
  firstPacketTimeoutMs: number;
}>;
