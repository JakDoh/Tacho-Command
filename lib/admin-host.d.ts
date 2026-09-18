export declare const ADMIN_CANONICAL_HOST: "admin.tachocommand.com";

export declare function normalizeAdminHost(value: unknown): string | null;
export declare function isAdminHost(
  value: unknown,
  options?: Readonly<{ allowLocalhost?: boolean }>,
): boolean;
export declare function isAdminRequestHost(
  request: Request,
  options?: Readonly<{ allowLocalhost?: boolean }>,
): boolean;
