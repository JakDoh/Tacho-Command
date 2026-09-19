"use client";

import { useEffect, useMemo, useState } from "react";
import FieldProvenPremiumUi from "../app/field-proven-premium-ui";
import { createFieldProvenProductState } from "../../lib/field-proven-product-state.js";
import {
  cardStateFromLastGoodCardSnapshot,
  loadLastGoodCardSnapshot,
} from "../../lib/last-good-card-snapshot.js";
import { formatTachoCommandVersionLine } from "../../lib/product-version.js";
import { createAppV2LiveSession } from "../../lib/app-v2-live-session.js";
import { openBrowserAppV2FieldTransport } from "../../lib/app-v2-field-transport.js";
import { runAppV2FieldSession } from "../../lib/app-v2-field-session.js";
import styles from "./app-v2.module.css";

type RestoreState = "checking" | "restored" | "empty" | "invalid";
type LiveRunState = "idle" | "running" | "success" | "error";

function formatRestoreTime(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppV2Client() {
  const [restoreState, setRestoreState] = useState<RestoreState>("checking");
  const [cardState, setCardState] = useState<Readonly<Record<string, unknown>> | null>(null);
  const [capturedAtIso, setCapturedAtIso] = useState<string | null>(null);
  const [liveRunState, setLiveRunState] = useState<LiveRunState>("idle");
  const [liveSession, setLiveSession] = useState(() => createAppV2LiveSession());
  const [lastLiveSnapshot, setLastLiveSnapshot] = useState<Readonly<Record<string, unknown>> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const snapshot = loadLastGoodCardSnapshot(window.localStorage);
        if (!snapshot) {
          setRestoreState("empty");
          return;
        }

        const restoredCard = cardStateFromLastGoodCardSnapshot(snapshot);
        if (!restoredCard) {
          setRestoreState("invalid");
          return;
        }

        setCardState(restoredCard);
        setCapturedAtIso(snapshot.capturedAtIso);
        setRestoreState("restored");
      } catch {
        setRestoreState("invalid");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const state = useMemo(() => createFieldProvenProductState({
    live: liveRunState === "running" ? { connected: false } : lastLiveSnapshot ?? { connected: false },
    card: cardState ?? {},
    localeLabel: "SR · Srpski",
  }), [cardState, lastLiveSnapshot, liveRunState]);

  const restoredLabel = formatRestoreTime(capturedAtIso);

  const runLiveRead = async () => {
    if (liveRunState === "running") return;
    setLiveRunState("running");
    setLiveSession(createAppV2LiveSession({ phase: "connecting" }));

    const result = await runAppV2FieldSession({
      openTransport: () => openBrowserAppV2FieldTransport(),
    });

    if (result.status === "live") {
      setLastLiveSnapshot({ ...result.session.productLive, connected: false, snapshotConfirmed: true });
      setLiveSession(createAppV2LiveSession({
        phase: "disconnected",
        deviceLabel: result.session.productLive.deviceLabel,
        lastLiveReadLabel: result.session.productLive.lastLiveReadLabel,
      }));
      setLiveRunState("success");
      return;
    }

    setLiveSession(result.session);
    setLiveRunState("error");
  };

  return (
    <div className={styles.stage}>
      <section className={styles.commandDeck} aria-label="TachoCommand App V2 status">
        <div className={styles.deckLead}>
          <span className={styles.eyebrow}>TACHOCOMMAND · APP V2</span>
          <strong>Instrument spreman. Podaci ostaju tvoji.</strong>
          <p>
            Novi app source je odvojen od legacy recovery puta. Poslednje potpuno uspešno
            očitavanje kartice vraća se lokalno pre nove Bluetooth sesije.
          </p>
        </div>

        <div className={styles.deckStatus}>
          <div className={styles.statusOrb} data-state={restoreState} aria-hidden="true" />
          <div>
            <span>LOKALNI SNAPSHOT</span>
            <strong>
              {restoreState === "checking" && "Proveravam…"}
              {restoreState === "restored" && "Poslednje dobro očitavanje vraćeno"}
              {restoreState === "empty" && "Još nema sačuvanog očitavanja"}
              {restoreState === "invalid" && "Sačuvani zapis nije prihvaćen"}
            </strong>
            <small>{restoredLabel ? "Sačuvano " + restoredLabel : "Bez izmišljanja podataka"}</small>
          </div>
        </div>

        <div className={styles.liveBoundary}>
          <span>LIVE SESSION</span>
          <strong>
            {liveRunState === "success"
              ? "Poslednje LIVE očitavanje potvrđeno"
              : liveRunState === "running"
                ? "Povezujem i očitavam…"
                : liveSession.statusLabel}
          </strong>
          <small>
            {liveRunState === "success"
              ? "Očitavanje je završeno i transport uredno zatvoren."
              : liveSession.errorText ?? "Jedan bounded read, zatim čist teardown."}
          </small>
        </div>

        <div className={styles.deckActions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={runLiveRead}
            disabled={liveRunState === "running"}
          >
            {liveRunState === "running" ? "Očitavam…" : "Poveži i očitaj LIVE"}
          </button>
          <span className={styles.versionLine}>{formatTachoCommandVersionLine()}</span>
        </div>
      </section>

      <section className={styles.instrumentFrame} aria-label="TachoCommand premium instrument">
        <FieldProvenPremiumUi state={state} />
      </section>

      <aside className={styles.truthStrip}>
        <span>APP V2 CANDIDATE</span>
        <p>
          Golden 0.32c card-transfer transport nije deo ovog izvora. Ovaj kandidat sada integriše
          premium prikaz, last-good restore i zaseban read-only LIVE transport kroz kontrolisani lifecycle.
        </p>
      </aside>
    </div>
  );
}
