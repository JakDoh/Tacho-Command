import type {FieldProvenHistoryDay} from './field-proven-product-state.js';
export declare function analyzeCardBreaks(days: readonly FieldProvenHistoryDay[], options?: {cutoffIso?: string}): {
 findings: {startDate:string;startMinute:number;date:string;endMinute:number;drivingMinutes:number;excessMinutes:number}[];
 incomplete:boolean;
};
