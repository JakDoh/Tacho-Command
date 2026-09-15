"use client";

import { useEffect, useState } from "react";

const LEGACY_CACHE_PREFIX = "tachocommand-shell-";

export default function DriverAppPage() {
  const [status, setStatus] = useState("Osvežavam TachoCommand…");

  useEffect(() => {
    let cancelled = false;

    const recover = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.startsWith(LEGACY_CACHE_PREFIX))
              .map((key) => caches.delete(key)),
          );
        }

        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      } catch {
        if (!cancelled) setStatus("Čistim staru verziju…");
      } finally {
        if (!cancelled) {
          window.location.replace(`/field-test?recovered=031&ts=${Date.now()}`);
        }
      }
    };

    void recover();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#07101d", color: "#f5f7fb", textAlign: "center" }}>
      <div>
        <h1 style={{ marginBottom: 8 }}>TachoCommand</h1>
        <p>{status}</p>
      </div>
    </main>
  );
}
