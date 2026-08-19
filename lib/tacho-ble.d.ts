export const TACHO_DOWNLOAD_SERVICE_UUID: string;
export const TACHO_DIAGNOSTICS_SERVICE_UUID: string;
export const TACHO_OPTIONAL_SERVICE_UUIDS: readonly string[];
export type ServiceClassification = Readonly<{
  normalizedServices: readonly string[];
  matchedStandardServices: readonly string[];
  hasStandardTachoService: boolean;
}>;
export function classifyTachoServices(serviceUuids?: readonly string[]): ServiceClassification;
export function classifyDiagnosticSession(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function buildCompatibilityReport(input?: {
  createdAt?: string;
  appVersion?: string;
  locale?: string;
  deviceName?: string;
  connectionState?: string;
  userAgent?: string;
  serviceUuids?: readonly string[];
}): Readonly<Record<string, unknown>>;
