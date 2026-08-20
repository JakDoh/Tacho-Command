"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js?v=0.16-cache-breaker-1";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const registerAndUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          updateViaCache: "none",
        });
        if (!cancelled) await registration.update();
      } catch {
        // PWA updates are best-effort; the app must keep working if SW registration fails.
      }
    };

    void registerAndUpdate();

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void registerAndUpdate();
    };

    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, []);

  return null;
}
