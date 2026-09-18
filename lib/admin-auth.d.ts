export declare const ADMIN_SESSION_COOKIE: "tc_admin_session";
export declare const ADMIN_SESSION_SECONDS: number;

export declare function verifyAdminAccessKey(expected: string, provided: string): Promise<boolean>;
export declare function createAdminSessionToken(secret: string, issuedAtSeconds?: number): Promise<string>;
export declare function verifyAdminSessionToken(
  secret: string,
  token: string | null,
  nowSeconds?: number,
): Promise<Readonly<{ issuedAt: number; expiresAt: number }> | null>;
export declare function readCookieValue(request: Request, cookieName: string): string | null;
