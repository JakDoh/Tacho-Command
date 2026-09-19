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
import { beginAppV2CardRead, createAppV2CardSession } from "../../lib/app-v2-card-session.js";
import { runBrowserAppV2GoldenCardRead } from "../../lib/app-v2-card-transport-controller-bridge.js";
import { openBrowserAppV2FieldTransport } from "../../lib/app-v2-field-transport.js";
import { runAppV2LiveAttemptWithTelemetry } from "../../lib/app-v2-technical-telemetry-bridge.js";
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
  const [cardSession, setCardSession] = useState(() => createAppV2CardSession());

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
        setCardSession(createAppV2CardSession({
          currentCard: restoredCard,
          capturedAtIso: snapshot.capturedAtIso,
        }));
        setRestoreState("restored");
      } catch {
        setRestoreState("invalid");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const state = useMemo(() => {
    const latestDiagnostics = liveSession.productLive ?? {};
    const stableLive = lastLiveSnapshot ?? { connected: false };

    return createFieldProvenProductState({
      live: liveRunState === "running"
        ? { connected: false }
        : {
            ...stableLive,
            attemptCode: latestDiagnostics.attemptCode ?? stableLive.attemptCode,
            telemetryAcceptedCount:
              latestDiagnostics.telemetryAcceptedCount ?? stableLive.telemetryAcceptedCount,
          },
      card: cardState ?? {},
      localeLabel: "SR · Srpski",
    });
  }, [cardState, lastLiveSnapshot, liveRunState, liveSession]);

  const restoredLabel = formatRestoreTime(capturedAtIso);

  const runLiveRead = async () => {
    if (liveRunState === "running" || cardSession.busy) return;
    setLiveRunState("running");
    setLiveSession(createAppV2LiveSession({ phase: "connecting" }));

    const result = await runAppV2LiveAttemptWithTelemetry({
      openTransport: () => openBrowserAppV2FieldTransport(),
    });

    if (result.status === "live") {
      const confirmedSnapshot = {
        ...result.session.productLive,
        connected: false,
        snapshotConfirmed: true,
        attemptCode: result.attemptCode,
        telemetryAcceptedCount: result.telemetryAcceptedCount,
      };
      setLastLiveSnapshot(confirmedSnapshot);
      setLiveSession(createAppV2LiveSession({
        phase: "disconnected",
        deviceLabel: result.session.productLive.deviceLabel,
        lastLiveReadLabel: result.session.productLive.lastLiveReadLabel,
        attemptCode: result.attemptCode,
        telemetryAcceptedCount: result.telemetryAcceptedCount,
      }));
      setLiveRunState("success");
      return;
    }

    setLiveSession(createAppV2LiveSession({
      phase: "error",
      deviceLabel: result.session.productLive?.deviceLabel,
      attemptCode: result.attemptCode,
      telemetryAcceptedCount: result.telemetryAcceptedCount,
      errorText: result.session.errorText,
    }));
    setLiveRunState("error");
  };

  const runCardRead = async () => {
    if (cardSession.busy || liveRunState === "running") return;

    const readingSession = beginAppV2CardRead(cardSession);
    setCardSession(readingSession);

    const result = await runBrowserAppV2GoldenCardRead({
      session: readingSession,
      storage: window.localStorage,
      capturedAtIso: new Date().toISOString(),
    });

    if (result.session) setCardSession(result.session);

    if (result.status === "accepted" && result.session?.currentCard) {
      setCardState(result.session.currentCard);
      setCapturedAtIso(result.session.capturedAtIso);
      setRestoreState("restored");
    }
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

        <div className={styles.liveBoundary}>
          <span>CARD SESSION</span>
          <strong>{cardSession.statusLabel}</strong>
          <small>
            {cardSession.errorText
              ?? (cardSession.busy
                ? "Prethodno dobro očitavanje ostaje prikazano dok novi full-card read ne bude potvrđen."
                : "Kompletan read mora proći transport, parser, validaciju i persistence pre zamene stanja.")}
          </small>
        </div>

        <div className={styles.deckActions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={runLiveRead}
            disabled={liveRunState === "running" || cardSession.busy}
          >
            {liveRunState === "running" ? "Očitavam…" : "Poveži i očitaj LIVE"}
          </button>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={runCardRead}
            disabled={cardSession.busy || liveRunState === "running"}
          >
            {cardSession.busy ? "Čitam karticu…" : "Očitaj kompletnu karticu"}
          </button>
          <span className={styles.versionLine}>{formatTachoCommandVersionLine()}</span>
        </div>
      </section>

      <section className={styles.instrumentFrame} aria-label="TachoCommand premium instrument">
        <FieldProvenPremiumUi state={state} />
      </section>

      <aside className={styles.truthStrip}>
        <span>APP V2 · FIELD-PROVEN CARD PATH</span>
        <p>
          Full-card put je fizički potvrđen 19.09.2026. na VDO DTCO 4.1a kroz Android Chrome / Driver Card Slot 1: 67.295 B, 269 submessages, 61 TLV objekat, Gen2 050402, 217 dnevnih zapisa i 56/56 dana. Ostali uređaji i browseri ostaju van dokazanog scope-a.
        </p>
      </aside>
    </div>
  );
}
