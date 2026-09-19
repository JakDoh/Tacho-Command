export type AppV2FieldTransport = Readonly<{
  deviceLabel: string;
  sendUds: (payload: readonly number[], timeoutMs?: number) => Promise<readonly number[] | null>;
  close: () => Promise<void>;
}>;

export declare function openAppV2FieldTransport(input?: Readonly<{
  bluetooth?: {
    requestDevice: (options: Readonly<{
      acceptAllDevices: boolean;
      optionalServices: readonly string[];
    }>) => Promise<unknown>;
  } | null;
  timeoutMs?: number;
  settleMs?: number;
}>): Promise<AppV2FieldTransport>;


export declare function openBrowserAppV2FieldTransport(input?: Readonly<{
  timeoutMs?: number;
  settleMs?: number;
}>): Promise<AppV2FieldTransport>;
