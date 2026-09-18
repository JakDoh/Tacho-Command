"use client";

import { useState } from "react";
import { trackProductAnalytics } from "../lib/product-analytics-client.js";

type Props = {
  label: string;
  loadingLabel?: string;
  errorLabel?: string;
  className?: string;
};

export default function TrialLauncher({
  label,
  loadingLabel = "Pokrećem…",
  errorLabel = "Demo trenutno nije dostupan. Pokušaj ponovo za nekoliko minuta.",
  className = "",
}: Props) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  const start = async () => {
    setStarting(true);
    setError(false);
    void trackProductAnalytics("trial_start", { surface: "landing" });
    try {
      const response = await fetch("/api/trial", { method: "POST" });
      if (!response.ok) throw new Error("Trial unavailable");
      void trackProductAnalytics("trial_success", { surface: "landing" });
      window.location.assign("/app");
    } catch {
      void trackProductAnalytics("trial_error", { surface: "landing" });
      setError(true);
      setStarting(false);
    }
  };

  return (
    <span className="trial-launcher">
      <button type="button" className={className} onClick={start} disabled={starting}>
        {starting ? loadingLabel : label}
      </button>
      {error && <small role="alert">{errorLabel}</small>}
    </span>
  );
}
