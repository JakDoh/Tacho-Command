"use client";

import { useEffect, useState } from "react";

const LEGACY_CACHE_PREFIXES = ["tachocommand-shell-v13", "tachocommand-shell-v14", "tachocommand-shell-v15"];

export default function DriverAppPage() {
  const [status, setStatus] = useState("Aktualizuji TachoCommand…");

  useEffect(() => {
    let cancelled = false;

    const recover = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
              .map((key) => caches.delete(key)),
          );
        }

        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      } catch {
        if (!cancelled) setStatus("Čistím starou verzi…");
      } finally {
        if (!cancelled) {
          window.location.replace(`/field-test?recovered=016&ts=${Date.now()}`);
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
