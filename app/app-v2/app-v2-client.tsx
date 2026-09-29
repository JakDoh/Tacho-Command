"use client";
import { APP_LANGUAGES, type AppLocale } from "../../lib/product-app-copy.js";

import type { CardTransportDiagnostic } from "../../lib/card-transport-diagnostic";
import { useEffect, useMemo, useRef, useState } from "react";
import FieldProvenPremiumUi from "../app/field-proven-premium-ui";
import { createFieldProvenProductState } from "../../lib/field-proven-product-state.js";
import {
  cardStateFromLastGoodCardSnapshot,
  loadLastGoodCardSnapshot,
  LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY,
} from "../../lib/last-good-card-snapshot.js";
import { formatTachoCommandVersionLine } from "../../lib/product-version.js";
import { createAppV2LiveSession } from "../../lib/app-v2-live-session.js";
import { beginAppV2CardRead, createAppV2CardSession, failAppV2CardRead } from "../../lib/app-v2-card-session.js";
import { runBrowserAppV2GoldenCardRead } from "../../lib/app-v2-card-transport-controller-bridge.js";
import { openBrowserAppV2FieldTransport } from "../../lib/app-v2-field-transport.js";
import { runAppV2LiveAttemptWithTelemetry } from "../../lib/app-v2-technical-telemetry-bridge.js";
import { runAppV2FieldLiveRead } from "../../lib/app-v2-field-live-adapter.js";
import { phoneTimeZone, projectCardTimelineForPhone } from "../../lib/app-v2-phone-timeline.js";
import { calendarCardPeriod } from "../../lib/card-period.js";
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
const LIVE_TEARDOWN_TIMEOUT_MS = 1500;
const LIVE_TO_CARD_SETTLE_MS = 5000;
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
  const closeStartedAt = performance.now();
  let timeoutId: number | null = null;
  const outcome = await Promise.race([
    transport.close().then(() => "closed" as const),
    new Promise<"timeout">((resolve) => {
      timeoutId = window.setTimeout(() => resolve("timeout"), LIVE_TEARDOWN_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  });
  if (outcome === "timeout") {
    try { transport.device?.gatt?.disconnect?.(); } catch {}
    throw new Error("LIVE_CLOSE_TIMEOUT");
  }
  const closeMs = Math.round(performance.now() - closeStartedAt);
  await waitForLiveRelease();
  return Object.freeze({ closeMs, settleMs: LIVE_TO_CARD_SETTLE_MS, totalMs: Math.round(performance.now() - closeStartedAt) });
}

function formatRestoreTime(value: string | null, locale: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toLocaleString(locale, {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppV2Client() {
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("sr");
  const [savedCardVisible, setSavedCardVisible] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [screenAwake, setScreenAwake] = useState(false);
  const readAbortRef = useRef<AbortController | null>(null);
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
  const [cardDiagnostic, setCardDiagnostic] = useState<CardTransportDiagnostic | null>(null);
  const [cardAttemptCode, setCardAttemptCode] = useState<string | null>(null);
  const liveTransportRef = useRef<PersistentLiveTransport | null>(null);
  const speedGuardTimerRef = useRef<number | null>(null);
  const liveRefreshTimerRef = useRef<number | null>(null);
  const udsMonitorBusyRef = useRef(false);
  const cardReadBusyRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => setDiagnosticsEnabled(new URLSearchParams(window.location.search).get("diagnostics") === "1"));
    try {
      const saved = localStorage.getItem("tachocommand-locale");
      const initial = saved ?? navigator.language.slice(0, 2);
      if (Object.hasOwn(APP_LANGUAGES, initial)) queueMicrotask(() => setLocale(initial as AppLocale));
    } catch {}
    const tick = () => setClock(Date.now());
    const timer = window.setInterval(tick, 10000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);

  useEffect(() => {
    const busy = cardSession.busy || cardHandoffPreparing || liveRunState === "running" || liveConnected;
    document.documentElement.dataset.tachoBusy = busy ? "true" : "false";
    window.dispatchEvent(new Event("tacho-busy-change"));
    if (!cardSession.busy && !cardHandoffPreparing) return () => {
      document.documentElement.dataset.tachoBusy = "false";
      window.dispatchEvent(new Event("tacho-busy-change"));
    };
    let closed = false;
    let lock: WakeLockSentinel | null = null;
    let requesting = false;
    const acquire = async () => {
      if (closed || lock || requesting || document.visibilityState !== "visible") return;
      requesting = true;
      try {
        const next = await navigator.wakeLock?.request("screen");
        if (!next) return;
        if (closed) { await next.release(); return; }
        lock = next;
        setScreenAwake(true);
        next.addEventListener("release", () => { lock = null; if (!closed) setScreenAwake(false); }, { once: true });
      } catch { if (!closed) setScreenAwake(false); }
      finally { requesting = false; }
    };
    const visible = () => { void acquire(); };
    document.addEventListener("visibilitychange", visible);
    void acquire();
    return () => { closed = true; document.removeEventListener("visibilitychange", visible); void lock?.release(); setScreenAwake(false); document.documentElement.dataset.tachoBusy = "false"; };
  }, [cardSession.busy, cardHandoffPreparing, liveRunState, liveConnected]);

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
            measuredAt: Date.now(),
          });
        } else if (refreshed.status === "incomplete") {
          setLastLiveSnapshot((previous) => previous ? { ...previous, snapshotConfirmed: false } : previous);
        } else {
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
    readAbortRef.current?.abort();
    void liveTransportRef.current?.close();
    liveTransportRef.current = null;
  }, []);

  const zone = phoneTimeZone();
  const projectedCard = useMemo(() => projectCardTimelineForPhone(cardState, zone, { now: new Date(clock) }), [cardState, zone, clock]);
  const period = useMemo(() => calendarCardPeriod(projectedCard?.historyDays, { now: new Date(clock), timeZone: zone }), [projectedCard, clock, zone]);
  const state = useMemo(() => {
    const latestDiagnostics = liveSession.productLive ?? {};
    const stableLive = lastLiveSnapshot ?? { connected: false };

    return createFieldProvenProductState({
      live: liveRunState === "running"
        ? { connected: false }
        : {
            ...stableLive,
            connected: liveConnected && Number(stableLive.measuredAt ?? 0) + 30000 >= clock,
            attemptCode: latestDiagnostics.attemptCode ?? stableLive.attemptCode,
            telemetryAcceptedCount:
              latestDiagnostics.telemetryAcceptedCount ?? stableLive.telemetryAcceptedCount,
          },
      card: savedCardVisible && projectedCard ? { ...projectedCard, fortnightDrivingMinutes: period.minutes } : {},
      profile: {
        continuousThresholdMinutes: 270,
        continuousWarningMinutes: 255,
        workBreakThresholdMinutes: 360,
      },
      localeLabel: locale.toUpperCase(),
    });
  }, [savedCardVisible, projectedCard, period, clock, locale, lastLiveSnapshot, liveConnected, liveRunState, liveSession]);

  const restoredLabel = formatRestoreTime(capturedAtIso, locale);

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
        measuredAt: Date.now(),
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
    const handoffStartedAt = performance.now();
    setCardDiagnostic(null);
    setCardReadProgress(null);
    setCardAttemptCode(null);
    let handoff: CardTransportDiagnostic["handoff"];
    try {
      handoff = await closeLiveForCard(transport);
    } catch (error) {
      setCardDiagnostic(Object.freeze({
        stage: "live_teardown", lastConfirmedStage: "stationary_confirmed",
        errorCode: error instanceof Error && error.message === "LIVE_CLOSE_TIMEOUT"
          ? "live_close_timeout" : "live_close_failed",
        elapsedMs: Math.round(performance.now() - handoffStartedAt),
        packets: 0, bytes: 0, pendingResponses: 0, firstPacketTimeoutMs: 90000,
        events: [
          { ms: 0, event: "live:close_start" },
          { ms: Math.round(performance.now() - handoffStartedAt), event: "live:close_failed" },
        ],
      }));
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
    setCardDiagnostic(null);
    setCardReadProgress(Object.freeze({ submessages: 0, byteLength: 0, complete: false }));

    const controller = new AbortController();
    readAbortRef.current = controller;
    const result = await runBrowserAppV2GoldenCardRead({
      session: readingSession,
      storage: window.localStorage,
      capturedAtIso: new Date().toISOString(),
      transportOptions: {
        device: selectedCardDevice,
        disconnectOnFinish: true,
        signal: controller.signal,
      },
      onDiagnostic: (diagnostic: CardTransportDiagnostic) => setCardDiagnostic(Object.freeze({ ...diagnostic, handoff })),
      onProgress: (progress: CardReadProgress) => setCardReadProgress(progress),
      onTelemetryAttempt: (attemptCode: string) => setCardAttemptCode(attemptCode),
    }).catch((error: unknown) => ({
      status: "error",
      session: failAppV2CardRead(readingSession, error instanceof Error ? error.message : undefined),
    })).finally(async () => {
      cardReadBusyRef.current = false;
      readAbortRef.current = null;
    });

    if (result.session) setCardSession(result.session);

    if (result.status === "accepted" && result.session?.currentCard) {
      setSavedCardVisible(true);
      setCardState(result.session.currentCard);
      setCapturedAtIso(result.session.capturedAtIso);
      setRestoreState("restored");
      return;
    }
  };

  const productPhase = cardSession.busy
    ? "card-reading"
    : cardHandoffPreparing
      ? "card-preparing"
      : liveRunState === "running"
        ? "connecting"
        : liveConnected
          ? "connected"
          : liveRunState === "error" || cardSession.phase === "error"
            ? "error"
            : "idle";
  const visibleErrorText = productPhase === "error"
    ? (cardSession.phase === "error" ? cardSession.errorText : liveSession.errorText)
    : null;

  return (
    <div className={styles.stage}>
      <section className={styles.instrumentFrame} aria-label="TachoCommand premium instrument">
        <FieldProvenPremiumUi
          state={state}
          controls={{
            phase: productPhase,
            restoreState,
            restoredLabel,
            errorText: visibleErrorText,
            cardReadProgress,
            cardAttemptCode,
            cardDiagnostic,
            diagnosticsEnabled,
            versionLine: formatTachoCommandVersionLine(),
            locale,
            onLocale: (next) => { setLocale(next); try { localStorage.setItem("tachocommand-locale", next); } catch {} },
            zone,
            periodLabel: period.start + " — " + period.end,
            periodComplete: period.complete,
            savedAvailable: Boolean(cardState) && !savedCardVisible,
            screenAwake,
            accepted: cardSession.phase === "accepted",
            onShowSaved: () => setSavedCardVisible(true),
            onForget: () => {
              try { localStorage.removeItem(LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY); }
              catch { return; }
              setCardState(null); setCapturedAtIso(null); setSavedCardVisible(false);
              setCardSession(createAppV2CardSession()); setRestoreState("empty"); setCardReadProgress(null);
            },
            onCancel: () => readAbortRef.current?.abort(),
            onConnect: runLiveRead,
            onReadCard: runCardRead,
            onDisconnect: () => { void closePersistentLive(); },
          }}
        />
      </section>
    </div>
  );
}
