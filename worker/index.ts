/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const LEGACY_APP_RECOVERY_HTML = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#08111f">
<title>TachoCommand aktualizace</title>
<style>html,body{margin:0;min-height:100%;background:#07101d;color:#f5f7fb;font-family:system-ui,-apple-system,sans-serif}main{min-height:100dvh;display:grid;place-items:center;padding:24px;text-align:center}h1{margin:0 0 8px}p{opacity:.8}</style>
</head>
<body><main><div><h1>TachoCommand</h1><p>Aktualizuji aplikaci…</p></div></main>
<script>
(async()=>{
  try {
    if ('caches' in self) {
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('tachocommand-shell-')).map(k=>caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
  } catch(e) {}
  location.replace('/field-test?recovered=016&ts='+Date.now());
})();
</script></body></html>`;

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/app" && request.method === "GET") {
      return new Response(LEGACY_APP_RECOVERY_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
          "Clear-Site-Data": '"cache"',
        },
      });
    }

    if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest") {
      const assetResponse = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResponse.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers,
      });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
