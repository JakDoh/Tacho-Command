export type AppV2CardPhase = "idle" | "reading" | "accepted" | "error";

export type AppV2CardSession = Readonly<{
  phase: AppV2CardPhase;
  busy: boolean;
  canStart: boolean;
  statusLabel: string;
  errorText: string | null;
  currentCard: Readonly<Record<string, unknown>> | null;
  capturedAtIso: string | null;
}>;

export declare function createAppV2CardSession(input?: Readonly<Record<string, unknown>>): AppV2CardSession;
export declare function beginAppV2CardRead(session?: Readonly<Record<string, unknown>>): AppV2CardSession;
export declare function acceptAppV2CardRead(
  session?: Readonly<Record<string, unknown>>,
  result?: Readonly<Record<string, unknown>>,
): AppV2CardSession | null;
export declare function failAppV2CardRead(
  session?: Readonly<Record<string, unknown>>,
  errorText?: string | null,
): AppV2CardSession | null;
