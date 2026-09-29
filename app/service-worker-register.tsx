"use client";
import { useEffect, useState } from "react";
import { flushQueuedTechnicalTelemetry } from "../lib/technical-telemetry-client.js";
const SERVICE_WORKER_URL = "/sw.js?v=2026-09-29-beta-2-origin-fix";
export default function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState("sr");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    let registration: ServiceWorkerRegistration | undefined;
    const sync = () => {
      setBusy(document.documentElement.dataset.tachoBusy === "true");
      try {
        setLocale(localStorage.getItem("tachocommand-locale") ?? "sr");
      } catch {}
    };
    const check = () => {
      if (!cancelled) setWaiting(registration?.waiting ?? null);
    };
    void navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { updateViaCache: "none" })
      .then((r) => {
        registration = r;
        sync();
        check();
        r.addEventListener("updatefound", () =>
          r.installing?.addEventListener("statechange", check),
        );
        return r.update();
      })
      .catch(() => {});
    const flush = () => { void flushQueuedTechnicalTelemetry(); };
    flush();
    window.addEventListener("online", flush);
    const visible = () => {
      if (document.visibilityState === "visible") flush();
      sync();
      if (document.visibilityState === "visible")
        void registration?.update().catch(() => {});
    };
    window.addEventListener("tacho-busy-change", sync);
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true;
      window.removeEventListener("online", flush);
      window.removeEventListener("tacho-busy-change", sync);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  const update = () => {
    if (document.documentElement.dataset.tachoBusy === "true" || !waiting)
      return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  };
  if (!waiting) return null;
  const updateCopy: Record<string, readonly [string,string]> = {
    sr: ["Ažuriranje je dostupno", "Ažuriranje nakon završetka očitavanja"],
    en: ["Update available", "Update after the read completes"],
    de: ["Aktualisierung verfügbar", "Nach dem Auslesen aktualisieren"],
    ru: ["Доступно обновление", "Обновить после завершения считывания"],
    bg: ["Има актуализация", "Актуализирай след края на прочитането"],
    ro: ["Actualizare disponibilă", "Actualizează după terminarea citirii"],
    hu: ["Frissítés érhető el", "Frissítés a kiolvasás befejezése után"],
  };
  const [label,hint] = updateCopy[locale] ?? updateCopy.en;
  return (
    <aside
      role="status"
      style={{ padding: 12, background: "#153344", color: "#fff" }}
    >
      <button disabled={busy} onClick={update}>
        {busy ? hint : label}
      </button>
    </aside>
  );
}
