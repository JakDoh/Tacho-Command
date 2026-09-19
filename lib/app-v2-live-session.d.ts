export type AppV2LivePhase =
  | "idle"
  | "connecting"
  | "transport-ready"
  | "reading"
  | "live"
  | "error"
  | "disconnected";

export type AppV2LiveSession = Readonly<{
  phase: AppV2LivePhase;
  connected: boolean;
  busy: boolean;
  canConnect: boolean;
  canDisconnect: boolean;
  statusLabel: string;
  errorText: string | null;
  productLive: Readonly<Record<string, unknown>>;
}>;

export declare const APP_V2_LIVE_PHASES: readonly AppV2LivePhase[];

export declare function createAppV2LiveSession(
  input?: Readonly<Record<string, unknown>>,
): AppV2LiveSession;

export declare function transitionAppV2LiveSession(
  session: Readonly<Record<string, unknown>>,
  nextPhase: AppV2LivePhase,
  patch?: Readonly<Record<string, unknown>>,
): AppV2LiveSession | null;

export declare function appV2LiveSessionFromTelemetry(
  input?: Readonly<Record<string, unknown>>,
): AppV2LiveSession;
