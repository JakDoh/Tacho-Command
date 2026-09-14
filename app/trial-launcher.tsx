"use client";

import { useState } from "react";

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
        {starting ? loadingLabel : label}
      </button>
      {error && <small role="alert">{errorLabel}</small>}
    </span>
  );
}
