// Bounded streaming parse: Content-Length is not trusted as the only limit.
export class RequestLimitError extends Error {
  constructor(public status: number) {
    super("Request limit");
  }
}
export async function readLimitedJson(
  request: Request,
  maxBytes = 32768,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new RequestLimitError(415);
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) throw new RequestLimitError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestLimitError(400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestLimitError(413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
// Per-isolate abuse backstop. A distributed production WAF/rate-limit remains a release gate.
const windows = new Map<string, { until: number; count: number }>();
export async function requestRateAllowed(
  request: Request,
  limit = 60,
  now = Date.now(),
) {
  const input =
    (request.headers.get("cf-connecting-ip") ?? "local") +
    "|" +
    new URL(request.url).pathname;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const key = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  for (const [id, entry] of windows) if (entry.until <= now) windows.delete(id);
  let entry = windows.get(key);
  if (!entry) {
    if (windows.size >= 2048) return false;
    entry = { until: now + 60000, count: 0 };
    windows.set(key, entry);
  }
  entry.count++;
  return entry.count <= limit;
}
