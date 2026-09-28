export const OPEN_RHMI_ROUTINE_ID: number;
export const RHMI_DIDS: Readonly<{
  TACHOGRAPH_VEHICLE_SPEED: number;
  DRIVER_1_WORKING_STATE: number;
  DRIVER_1_CONTINUOUS_DRIVING: number;
  DRIVER_1_CUMULATIVE_BREAK: number;
  DRIVER_1_CURRENT_DAILY_DRIVING: number;
  DRIVER_1_CURRENT_WEEKLY_DRIVING: number;
}>;

export function buildTesterPresentRequest(): readonly number[];
export function buildOpenRhmiStartRequest(): readonly number[];
export function buildOpenRhmiStatusRequest(): readonly number[];
export function buildReadDataByIdentifier(did: number): readonly number[];
export function inspectVehicleSpeedDid(responseBytes?: readonly number[]): Readonly<{
  valid: boolean;
  payload: readonly number[];
}>;
export function classifyStationaryVehicleSpeed(responseBytes?: readonly number[]): Readonly<{
  valid: boolean;
  stationary: boolean;
  payload: readonly number[];
}>;

export type OpenRhmiClassification = Readonly<{
  packetHeaderValid: boolean;
  responseService: number | null;
  responseType: "start-positive" | "status-positive" | "negative" | "unexpected";
  routineControlType: number | null;
  routineIdentifier: string | null;
  statusCode: number | null;
  negativeResponseCode: number | null;
}>;

export function classifyOpenRhmiPacket(packet?: readonly number[]): OpenRhmiClassification;

export type DriverWorkingState = Readonly<{
  valid: boolean;
  activity: "rest" | "available" | "work" | "drive" | "unknown";
  activityCode?: number;
}>;

export function parseDriverWorkingState(responseBytes?: readonly number[]): DriverWorkingState;
export function parseDriverMinutesDid(responseBytes: readonly number[] | undefined, expectedDid: number): Readonly<{ valid: boolean; minutes: number | null; raw?: number }>;
export function describeRhmiStatus(statusCode: number | null | undefined): string;
