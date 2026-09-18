export const ADMIN_CANONICAL_HOST = "admin.tachocommand.com";

export function normalizeAdminHost(value) {
  if (typeof value !== "string") return null;
  const candidate = value.split(",")[0].trim().toLowerCase();
  if (!candidate) return null;

  if (candidate.startsWith("[")) {
    const closing = candidate.indexOf("]");
    if (closing < 0) return null;
    return candidate.slice(1, closing);
  }

  return candidate.split(":")[0] || null;
}

export function isAdminHost(value, options = {}) {
  const host = normalizeAdminHost(value);
  if (!host) return false;
  if (host === ADMIN_CANONICAL_HOST) return true;

  if (options.allowLocalhost === true) {
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }

  return false;
}

export function isAdminRequestHost(request, options = {}) {
  if (!request || typeof request.headers?.get !== "function") return false;
  return isAdminHost(request.headers.get("host"), options);
}
