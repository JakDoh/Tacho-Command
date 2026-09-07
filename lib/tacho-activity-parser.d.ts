import type { DrivingSnapshot } from "./tacho-rules";

export const ACTIVITY_REST: 0;
export const ACTIVITY_AVAILABILITY: 1;
export const ACTIVITY_WORK: 2;
export const ACTIVITY_DRIVING: 3;

export interface ActivityChange {
  slot: number;
  drivingStatus: number;
  cardStatus: number;
  activity: number;
  timeMinutes: number;
}

export interface DailyActivityRecord {
  date: Date;
  timestamp: number;
  presenceCounter: number;
  dayDistanceKm: number;
  changes: ActivityChange[];
}

export interface PlaceRecord {
  entryTime: Date;
  entryType: "begin" | "end" | "other";
  countryCode: number;
  regionCode: number;
  odometerKm: number;
}

export function decodeActivityChangeInfo(word: number): ActivityChange;
export function parseDriverActivityData(rawBytes: Uint8Array | readonly number[]): DailyActivityRecord[];
export function parseCardPlaces(rawBytes: Uint8Array | readonly number[]): PlaceRecord[];
export function calculateDrivingSnapshotFromCard(records: DailyActivityRecord[]): DrivingSnapshot;
