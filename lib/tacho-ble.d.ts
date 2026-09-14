export const TACHO_DOWNLOAD_SERVICE_UUID: string;
export const TACHO_DIAGNOSTICS_SERVICE_UUID: string;
export const TACHO_DOWNLOAD_FIFO_UUID: string;
export const TACHO_DOWNLOAD_CREDITS_UUID: string;
export const TACHO_DIAGNOSTICS_FIFO_UUID: string;
export const TACHO_DIAGNOSTICS_CREDITS_UUID: string;
export const TACHO_OPTIONAL_SERVICE_UUIDS: readonly string[];

export type ServiceClassification = Readonly<{
  normalizedServices: readonly string[];
  matchedStandardServices: readonly string[];
  hasStandardTachoService: boolean;
}>;

export function classifyTachoServices(serviceUuids?: readonly string[]): ServiceClassification;
export function classifyTachoTransport(serviceCharacteristics?: readonly any[]): Readonly<Record<string, any>>;
export function classifyFlowControl(input?: Record<string, unknown>): Readonly<Record<string, any>>;
export function classifyApplicationProbe(input?: Record<string, unknown>): Readonly<Record<string, any>>;
export function classifyDiagnosticSession(input?: Record<string, unknown>): Readonly<Record<string, any>>;
export function classifyRemoteHmi(input?: Record<string, unknown>): Readonly<Record<string, any>>;
export function classifyDriverCardRead(input?: Record<string, unknown>): Readonly<Record<string, any>>;

export function buildCompatibilityReport(input?: Record<string, any>): Readonly<Record<string, any>>;
