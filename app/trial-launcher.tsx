"use client";

import { useState } from "react";

export default function TrialLauncher({ label, className = "" }: { label: string; className?: string }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  const start = async () => {
    setStarting(true);
    setError(false);
    try {
      const response = await fetch("/api/trial", { method: "POST" });
      if (!response.ok) throw new Error("Trial unavailable");
      window.location.assign("/app");
    } catch {
      setError(true);
      setStarting(false);
    }
  };

  return (
    <span className="trial-launcher">
      <button type="button" className={className} onClick={start} disabled={starting}>
        {starting ? "Spouštím…" : label}
      </button>
      {error && <small role="alert">Demo v současné době není k dispozici. Zkuste to prosím za několik minut znovu.</small>}
    </span>
  );
}
