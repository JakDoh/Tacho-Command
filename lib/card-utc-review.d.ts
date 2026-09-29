export declare function reviewUtcCardBreaks(card: Readonly<Record<string, unknown>> | null, timeZone?: string): {
  findings: {startDate:string;startMinute:number;date:string;endMinute:number;drivingMinutes:number;excessMinutes:number;startLabel:string;endLabel:string}[];
  incomplete:boolean;
};
export declare function exportUtcCardCsv(card: Readonly<Record<string, unknown>> | null, timeZone?: string, saved?: boolean): string;
