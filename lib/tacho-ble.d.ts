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

export interface ServiceCharacteristicEntry {
  readonly serviceUuid: string;
  readonly characteristicUuids: readonly string[];
}

export function classifyTachoServices(serviceUuids?: readonly string[]): ServiceClassification;
export function classifyTachoTransport(serviceCharacteristics?: readonly ServiceCharacteristicEntry[]): Readonly<{
  serviceCharacteristics: readonly ServiceCharacteristicEntry[];
  checks: Readonly<Record<string, boolean>>;
  transportReady: boolean;
}>;
export function classifyFlowControl(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function classifyApplicationProbe(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function classifyDiagnosticSession(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function classifyRemoteHmi(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function classifyDriverCardRead(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;

export function buildCompatibilityReport(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
