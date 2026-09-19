export type AppV2CardResultBoundaryResult = Readonly<{
  status: "accepted" | "rejected_invalid" | "rejected_incomplete" | "storage_unavailable" | "storage_error";
  card: Readonly<Record<string, unknown>> | null;
  snapshot: Readonly<Record<string, unknown>> | null;
  source: string | null;
}>;

export declare function acceptAppV2CardResult(input?: Readonly<{
  storage?: {
    setItem: (key: string, value: string) => void;
  } | null;
  cardState?: Readonly<Record<string, unknown>> | null;
  capturedAtIso?: string;
  source?: string;
}>): AppV2CardResultBoundaryResult;
