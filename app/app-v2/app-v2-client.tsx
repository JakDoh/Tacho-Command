"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { runAppV2FieldLiveRead } from "../../lib/app-v2-field-live-adapter.js";
import styles from "./app-v2.module.css";

type RestoreState = "checking" | "restored" | "empty" | "invalid";
type LiveRunState = "idle" | "running" | "success" | "error";
type CardReadProgress = Readonly<{
  submessages: number;
  byteLength: number;
  complete: boolean;
}>;
type PersistentLiveTransport = {
  deviceLabel?: string;
  device?: {
    gatt?: {
      connected?: boolean;
      disconnect?: () => void;
    };
  };
  sendUds: (payload: readonly number[], timeoutMs?: number) => Promise<readonly number[] | null>;
  assertStationary: () => Promise<unknown>;
  isConnected?: () => boolean;
  close: () => Promise<void>;
};
type WakeLockSentinelLike = { release: () => Promise<void> };
const LIVE_TEARDOWN_TIMEOUT_MS = 1500;
const LIVE_TO_CARD_SETTLE_MS = 3000;
const LIVE_MONITOR_IDLE_TIMEOUT_MS = 10000;
const LIVE_MONITOR_IDLE_POLL_MS = 50;

const waitForLiveRelease = () => new Promise<void>((resolve) => {
  window.setTimeout(resolve, LIVE_TO_CARD_SETTLE_MS);
});

async function waitForLiveMonitorIdle(isBusy: () => boolean) {
  const deadline = Date.now() + LIVE_MONITOR_IDLE_TIMEOUT_MS;
  while (isBusy()) {
    if (Date.now() >= deadline) {
      throw new Error("LIVE provera se nije završila na vreme.");
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, LIVE_MONITOR_IDLE_POLL_MS);
    });
  }
}

async function closeLiveForCard(transport: PersistentLiveTransport) {
  let timeoutId: number | null = null;
  const outcome = await Promise.race([
    transport.close().then(() => "closed" as const, () => "failed" as const),
    new Promise<"timeout">((resolve) => {
      timeoutId = window.setTimeout(() => resolve("timeout"), LIVE_TEARDOWN_TIMEOUT_MS);
    }),
  ]);
  if (timeoutId !== null) window.clearTimeout(timeoutId);
  if (outcome === "failed") throw new Error("LIVE teardown failed");
  if (outcome === "timeout") {
    try { transport.device?.gatt?.disconnect?.(); } catch {}
  }
  await waitForLiveRelease();
}

async function requestCardWakeLock(): Promise<WakeLockSentinelLike | null> {
  const wakeLock = (navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
  }).wakeLock;
  if (!wakeLock) return null;
  try {
    return await wakeLock.request("screen");
  } catch {
    return null;
  }
}

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
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveSession, setLiveSession] = useState(() => createAppV2LiveSession());
  const [lastLiveSnapshot, setLastLiveSnapshot] = useState<Readonly<Record<string, unknown>> | null>(null);
  const [cardSession, setCardSession] = useState(() => createAppV2CardSession());
  const [cardReadProgress, setCardReadProgress] = useState<CardReadProgress | null>(null);
  const [cardHandoffPreparing, setCardHandoffPreparing] = useState(false);
  const [cardAttemptCode, setCardAttemptCode] = useState<string | null>(null);
  const liveTransportRef = useRef<PersistentLiveTransport | null>(null);
  const speedGuardTimerRef = useRef<number | null>(null);
  const liveRefreshTimerRef = useRef<number | null>(null);
  const udsMonitorBusyRef = useRef(false);
  const cardReadBusyRef = useRef(false);

  const stopSpeedGuard = () => {
    if (speedGuardTimerRef.current !== null) {
      window.clearInterval(speedGuardTimerRef.current);
      speedGuardTimerRef.current = null;
    }
    if (liveRefreshTimerRef.current !== null) {
      window.clearInterval(liveRefreshTimerRef.current);
      liveRefreshTimerRef.current = null;
    }
  };

  const closePersistentLive = async (errorText: string | null = null) => {
    stopSpeedGuard();
    const transport = liveTransportRef.current;
    liveTransportRef.current = null;
    setLiveConnected(false);
    try { await transport?.close(); } catch {}
    setLastLiveSnapshot((previous) => previous ? { ...previous, connected: false } : previous);
    if (errorText) {
      setLiveSession(createAppV2LiveSession({ phase: "error", errorText }));
      setLiveRunState("error");
    }
  };

  const startSpeedGuard = (transport: PersistentLiveTransport) => {
    stopSpeedGuard();
    speedGuardTimerRef.current = window.setInterval(async () => {
      if (cardReadBusyRef.current || udsMonitorBusyRef.current || liveTransportRef.current !== transport) return;
      udsMonitorBusyRef.current = true;
      try {
        await transport.assertStationary();
      } catch (error) {
        await closePersistentLive(error instanceof Error ? error.message : "Brzina nije potvrđena — BLE veza je prekinuta.");
      } finally {
        udsMonitorBusyRef.current = false;
      }
    }, 1000);

    liveRefreshTimerRef.current = window.setInterval(async () => {
      if (cardReadBusyRef.current || udsMonitorBusyRef.current || liveTransportRef.current !== transport) return;
      udsMonitorBusyRef.current = true;
      try {
        await transport.assertStationary();
        const refreshed = await runAppV2FieldLiveRead({
          sendUds: transport.sendUds,
          deviceLabel: transport.deviceLabel,
        });
        if (refreshed.status === "live") {
          setLastLiveSnapshot({
            ...refreshed.session.productLive,
            connected: true,
            snapshotConfirmed: true,
          });
        } else if (refreshed.status !== "incomplete") {
          throw new Error(refreshed.session.errorText ?? "LIVE veza je prekinuta.");
        }
      } catch (error) {
        await closePersistentLive(error instanceof Error ? error.message : "LIVE veza je prekinuta.");
      } finally {
        udsMonitorBusyRef.current = false;
      }
    }, 10000);
  };

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

  useEffect(() => () => {
    stopSpeedGuard();
    void liveTransportRef.current?.close();
    liveTransportRef.current = null;
  }, []);

  const state = useMemo(() => {
    const latestDiagnostics = liveSession.productLive ?? {};
    const stableLive = lastLiveSnapshot ?? { connected: false };

    return createFieldProvenProductState({
      live: liveRunState === "running"
        ? { connected: false }
        : {
            ...stableLive,
            connected: liveConnected,
            attemptCode: latestDiagnostics.attemptCode ?? stableLive.attemptCode,
            telemetryAcceptedCount:
              latestDiagnostics.telemetryAcceptedCount ?? stableLive.telemetryAcceptedCount,
          },
      card: cardState ?? {},
      profile: {
        continuousThresholdMinutes: 270,
        continuousWarningMinutes: 255,
        workBreakThresholdMinutes: 360,
      },
      localeLabel: "SR · Srpski",
    });
  }, [cardState, lastLiveSnapshot, liveConnected, liveRunState, liveSession]);

  const restoredLabel = formatRestoreTime(capturedAtIso);

  const runLiveRead = async () => {
    if (liveRunState === "running" || cardSession.busy || cardReadBusyRef.current) return;
    setLiveRunState("running");
    setLiveSession(createAppV2LiveSession({ phase: "connecting" }));
    await closePersistentLive();

    const result = await runAppV2LiveAttemptWithTelemetry({
      openTransport: () => openBrowserAppV2FieldTransport(),
      keepTransportOpen: true,
    });

    if (["live", "incomplete"].includes(result.status) && result.transport) {
      const transport = result.transport as PersistentLiveTransport;
      liveTransportRef.current = transport;
      setLiveConnected(true);
      startSpeedGuard(transport);
      const confirmedSnapshot = {
        ...result.session.productLive,
        connected: true,
        snapshotConfirmed: result.status === "live",
        deviceLabel: result.session.productLive.deviceLabel ?? transport.deviceLabel,
        attemptCode: result.attemptCode,
        telemetryAcceptedCount: result.telemetryAcceptedCount,
      };
      setLastLiveSnapshot(confirmedSnapshot);
      setLiveSession(createAppV2LiveSession({
        phase: "live",
        deviceLabel: result.session.productLive.deviceLabel,
        lastLiveReadLabel: result.status === "live"
          ? result.session.productLive.lastLiveReadLabel
          : undefined,
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
    if (cardSession.busy || cardReadBusyRef.current || liveRunState === "running") return;
    const transport = liveTransportRef.current;
    if (!transport || transport.isConnected?.() === false) {
      setLiveSession(createAppV2LiveSession({
        phase: "error",
        errorText: "Prvo povežite tahograf za bezbednu LIVE vezu.",
      }));
      setLiveRunState("error");
      return;
    }

    // Freeze the LIVE monitor before entering the handoff. A speed guard or
    // refresh request may already be in flight, so wait for that single UDS
    // operation to finish rather than racing another request against it.
    cardReadBusyRef.current = true;
    setCardHandoffPreparing(true);
    stopSpeedGuard();
    try {
      await waitForLiveMonitorIdle(() => udsMonitorBusyRef.current);
    } catch (error) {
      cardReadBusyRef.current = false;
      setCardHandoffPreparing(false);
      await closePersistentLive(error instanceof Error ? error.message : "LIVE provera nije završena.");
      return;
    }

    if (liveTransportRef.current !== transport || transport.isConnected?.() === false) {
      cardReadBusyRef.current = false;
      setCardHandoffPreparing(false);
      await closePersistentLive("LIVE veza je završena pre očitavanja kartice.");
      return;
    }

    // LIVE and card download use separate GATT sessions, but they target the
    // same browser-authorized BluetoothDevice. Reuse that handle so the
    // handoff does not open a second chooser or depend on transient activation.
    const selectedCardDevice = transport.device;
    if (!selectedCardDevice?.gatt) {
      cardReadBusyRef.current = false;
      setCardHandoffPreparing(false);
      setLiveSession(createAppV2LiveSession({
        phase: "error",
        errorText: "Tahograf iz LIVE veze nije dostupan za očitavanje kartice.",
      }));
      setLiveRunState("error");
      return;
    }

    try {
      await transport.assertStationary();
    } catch (error) {
      cardReadBusyRef.current = false;
      setCardHandoffPreparing(false);
      await closePersistentLive(error instanceof Error ? error.message : "Brzina nije potvrđena — BLE veza je prekinuta.");
      return;
    }

    // Diagnostics/LIVE and the proven Download protocol remain separate
    // sessions. End diagnostics cleanly, allow the DTCO to release that
    // session, then let the locked card path reconnect the retained device.
    stopSpeedGuard();
    liveTransportRef.current = null;
    setLiveConnected(false);
    setLastLiveSnapshot((previous) => previous ? { ...previous, connected: false } : previous);
    try {
      await closeLiveForCard(transport);
    } catch {
      cardReadBusyRef.current = false;
      setCardHandoffPreparing(false);
      setLiveSession(createAppV2LiveSession({
        phase: "error",
        errorText: "LIVE veza nije uredno zatvorena pre očitavanja kartice.",
      }));
      setLiveRunState("error");
      return;
    }

    const readingSession = beginAppV2CardRead(cardSession);
    setCardHandoffPreparing(false);
    setCardSession(readingSession);
    setCardAttemptCode(null);
    setCardReadProgress(Object.freeze({ submessages: 0, byteLength: 0, complete: false }));

    const wakeLock = await requestCardWakeLock();
    const result = await runBrowserAppV2GoldenCardRead({
      session: readingSession,
      storage: window.localStorage,
      capturedAtIso: new Date().toISOString(),
      transportOptions: {
        device: selectedCardDevice,
        disconnectOnFinish: true,
      },
      onProgress: (progress: CardReadProgress) => setCardReadProgress(progress),
      onTelemetryAttempt: (attemptCode: string) => setCardAttemptCode(attemptCode),
    }).finally(async () => {
      cardReadBusyRef.current = false;
      try { await wakeLock?.release(); } catch {}
    });

    if (result.session) setCardSession(result.session);

    if (result.status === "accepted" && result.session?.currentCard) {
      setCardState(result.session.currentCard);
      setCapturedAtIso(result.session.capturedAtIso);
      setRestoreState("restored");
      return;
    }
  };

  return (
    <div className={styles.stage}>
      <section className={styles.instrumentFrame} aria-label="TachoCommand premium instrument">
        <FieldProvenPremiumUi
          state={state}
          controls={{
            phase: cardSession.busy
              ? "card-reading"
              : cardHandoffPreparing
                ? "card-preparing"
              : liveRunState === "running"
                ? "connecting"
                : liveConnected
                  ? "connected"
                  : liveRunState === "error" || cardSession.phase === "error"
                    ? "error"
                    : "idle",
            restoreState,
            restoredLabel,
            errorText: cardSession.errorText ?? liveSession.errorText ?? null,
            cardReadProgress,
            cardAttemptCode,
            versionLine: formatTachoCommandVersionLine(),
            onConnect: runLiveRead,
            onReadCard: runCardRead,
          }}
        />
      </section>
    </div>
  );
}
