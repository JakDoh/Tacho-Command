"use client";
import { abortableBleDelay } from "../../lib/ble-operation.js";
import EmailAccessPanel from "../email-access-panel";
import { useEmailTrial } from "../../lib/use-email-trial";
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

const waitForLiveRelease = (signal?: AbortSignal) => abortableBleDelay(LIVE_TO_CARD_SETTLE_MS, signal);

async function waitForLiveMonitorIdle(isBusy: () => boolean, signal?: AbortSignal) {
  const deadline = performance.now() + LIVE_MONITOR_IDLE_TIMEOUT_MS;
  while (isBusy()) {
    if (performance.now() >= deadline) {
      throw new Error("LIVE provera se nije završila na vreme.");
    }
    await abortableBleDelay(LIVE_MONITOR_IDLE_POLL_MS, signal);
  }
}

async function closeLiveForCard(transport: PersistentLiveTransport, signal?: AbortSignal) {
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
  await waitForLiveRelease(signal);
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
  const liveOpenAbortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const liveOpeningRef = useRef(false);
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

  const closePersistentLive = async (errorText: string | null = null, expected?: PersistentLiveTransport) => {
    if (expected && liveTransportRef.current !== expected) return;
    const generation = generationRef.current;
    stopSpeedGuard();
    const transport = liveTransportRef.current;
    liveTransportRef.current = null;
    setLiveConnected(false);
    try { await transport?.close(); } catch {}
    if (!mountedRef.current || generationRef.current !== generation || liveTransportRef.current) return;
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
        await closePersistentLive(error instanceof Error ? error.message : "Brzina nije potvrđena — BLE veza je prekinuta.", transport);
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
          shouldContinue: () => mountedRef.current && !cardReadBusyRef.current && liveTransportRef.current === transport,
        });
        if (!mountedRef.current || cardReadBusyRef.current || liveTransportRef.current !== transport) return;
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
        await closePersistentLive(error instanceof Error ? error.message : "LIVE veza je prekinuta.", transport);
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

  useEffect(() => { mountedRef.current = true; return () => {
    mountedRef.current = false;
    generationRef.current += 1;
    liveOpenAbortRef.current?.abort();
    stopSpeedGuard();
    readAbortRef.current?.abort();
    void liveTransportRef.current?.close();
    liveTransportRef.current = null;
  }; }, []);

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

  const trial = useEmailTrial(() => { generationRef.current += 1; liveOpenAbortRef.current?.abort(); readAbortRef.current?.abort(); void closePersistentLive(); });

  const runLiveRead = async () => {
    if (!trial.permitsNow()) { void trial.refresh(); return; }
    if (liveOpeningRef.current || cardSession.busy || cardReadBusyRef.current) return;
    liveOpeningRef.current = true;
    const generation = ++generationRef.current;
    const controller = new AbortController();
    liveOpenAbortRef.current = controller;
    setLiveRunState("running");
    setLiveSession(createAppV2LiveSession({ phase: "connecting" }));
    try {
      await closePersistentLive();
      if (controller.signal.aborted) return;
      const result = await runAppV2LiveAttemptWithTelemetry({
        openTransport: () => openBrowserAppV2FieldTransport({ signal: controller.signal }),
        keepTransportOpen: true,
      });
      if (!mountedRef.current || generationRef.current !== generation || controller.signal.aborted || !trial.permitsNow()) {
        try { await (result.transport as PersistentLiveTransport | undefined)?.close(); } catch {}
        return;
      }
      if (["live", "incomplete"].includes(result.status) && result.transport) {
        const transport = result.transport as PersistentLiveTransport;
        liveTransportRef.current = transport;
        setLiveConnected(true);
        startSpeedGuard(transport);
        setLastLiveSnapshot({
          ...result.session.productLive,
          connected: true,
          snapshotConfirmed: result.status === "live",
          measuredAt: Date.now(),
          deviceLabel: result.session.productLive.deviceLabel ?? transport.deviceLabel,
          attemptCode: result.attemptCode,
          telemetryAcceptedCount: result.telemetryAcceptedCount,
        });
        setLiveSession(createAppV2LiveSession({ phase: "live", deviceLabel: transport.deviceLabel,
          lastLiveReadLabel: result.status === "live" ? result.session.productLive.lastLiveReadLabel : undefined,
          attemptCode: result.attemptCode, telemetryAcceptedCount: result.telemetryAcceptedCount }));
        setLiveRunState("success");
      } else {
        setLiveSession(createAppV2LiveSession({ phase: "error", errorText: result.session.errorText,
          attemptCode: result.attemptCode, telemetryAcceptedCount: result.telemetryAcceptedCount }));
        setLiveRunState("error");
      }
    } finally {
      if (liveOpenAbortRef.current === controller) liveOpenAbortRef.current = null;
      liveOpeningRef.current = false;
      if (mountedRef.current && controller.signal.aborted) setLiveRunState("idle");
    }
  };

  const runCardRead = async () => {
    if (!trial.permitsNow()) { void trial.refresh(); return; }
    if (cardSession.busy || cardReadBusyRef.current || liveOpeningRef.current) return;
    const transport = liveTransportRef.current;
    if (!transport || transport.isConnected?.() === false) {
      setLiveSession(createAppV2LiveSession({ phase: "error", errorText: "Prvo povežite tahograf za bezbednu LIVE vezu." }));
      setLiveRunState("error"); return;
    }
    const controller = new AbortController();
    readAbortRef.current = controller;
    const generation = generationRef.current;
    const current = () => mountedRef.current && generationRef.current === generation && !controller.signal.aborted;
    cardReadBusyRef.current = true;
    setCardHandoffPreparing(true);
    setCardDiagnostic(null); setCardReadProgress(null); setCardAttemptCode(null);
    stopSpeedGuard();
    let readingSession: ReturnType<typeof beginAppV2CardRead> | null = null;
    try {
      // The refresh yields between UDS requests; only its current request drains.
      await waitForLiveMonitorIdle(() => udsMonitorBusyRef.current, controller.signal);
      if (!current()) throw new Error("BLE_CANCELLED");
      if (liveTransportRef.current !== transport || transport.isConnected?.() === false) throw new Error("LIVE veza je završena pre očitavanja kartice.");
      const selectedCardDevice = transport.device;
      if (!selectedCardDevice?.gatt) throw new Error("Tahograf iz LIVE veze nije dostupan za očitavanje kartice.");
      await transport.assertStationary();
      if (!current()) throw new Error("BLE_CANCELLED");
      stopSpeedGuard();
      liveTransportRef.current = null;
      setLiveConnected(false);
      setLastLiveSnapshot(previous => previous ? { ...previous, connected: false } : previous);
      const handoffStartedAt = performance.now();
      let handoff: CardTransportDiagnostic["handoff"];
      try { handoff = await closeLiveForCard(transport, controller.signal); }
      catch (error) {
        if (current()) setCardDiagnostic(Object.freeze({
          stage: "live_teardown", lastConfirmedStage: "stationary_confirmed",
          errorCode: error instanceof Error && error.message === "LIVE_CLOSE_TIMEOUT" ? "live_close_timeout" : "live_close_failed",
          elapsedMs: Math.round(performance.now() - handoffStartedAt), packets: 0, bytes: 0, pendingResponses: 0, firstPacketTimeoutMs: 90000,
          events: [{ ms: 0, event: "live:close_start" }, { ms: Math.round(performance.now() - handoffStartedAt), event: "live:close_failed" }],
        }));
        throw error;
      }
      if (!current() || !trial.permitsNow()) throw new Error("BLE_CANCELLED");
      readingSession = beginAppV2CardRead(cardSession);
      setCardSession(readingSession); setCardHandoffPreparing(false);
      setCardReadProgress(Object.freeze({ submessages: 0, byteLength: 0, complete: false }));
      let storage: Storage | null = null;
      try { storage = window.localStorage; } catch {}
      const result = await runBrowserAppV2GoldenCardRead({
        session: readingSession, storage, capturedAtIso: new Date().toISOString(),
        transportOptions: { device: selectedCardDevice, disconnectOnFinish: true, signal: controller.signal },
        onDiagnostic: diagnostic => { if (current()) setCardDiagnostic(Object.freeze({ ...diagnostic, handoff })); },
        onProgress: progress => { if (current()) setCardReadProgress(progress); },
        onTelemetryAttempt: code => { if (current()) setCardAttemptCode(code); },
      });
      if (!mountedRef.current || generationRef.current !== generation) return;
      if (result.session) setCardSession(result.session);
      if ((result.status === "accepted" || result.status === "accepted_unsaved") && result.session?.currentCard) {
        setSavedCardVisible(true); setCardState(result.session.currentCard);
        setCapturedAtIso(result.session.capturedAtIso); setRestoreState("restored");
      }
    } catch (error) {
      if (liveTransportRef.current === transport) await closePersistentLive(null, transport);
      else { try { await transport.close(); } catch {} }
      if (!mountedRef.current) return;
      if (readingSession) setCardSession(failAppV2CardRead(readingSession) ?? createAppV2CardSession());
      setLiveSession(createAppV2LiveSession({ phase: controller.signal.aborted ? "idle" : "error",
        errorText: error instanceof Error ? error.message : "LIVE veza je prekinuta." }));
      setLiveRunState(controller.signal.aborted ? "idle" : "error");
    } finally {
      if (readAbortRef.current === controller) readAbortRef.current = null;
      cardReadBusyRef.current = false;
      if (mountedRef.current) {
        setCardHandoffPreparing(false);
        if (controller.signal.aborted) setCardSession(previous => createAppV2CardSession({ ...previous, phase: "idle" }));
      }
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
      <EmailAccessPanel locale={locale} access={trial.access} onRefresh={() => void trial.refresh()} />
      <section className={styles.instrumentFrame} aria-label="TachoCommand premium instrument">
        <FieldProvenPremiumUi
          state={state}
          controls={{
            canonicalCard: savedCardVisible ? cardState : null,
            persisted: cardSession.persisted,
            phase: productPhase,
            accessAllowed: (trial.access.status === "active" || trial.access.status === "owner") && trial.permitsNow(),
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
            onCancel: () => { liveOpenAbortRef.current?.abort(); readAbortRef.current?.abort(); },
            onConnect: runLiveRead,
            onReadCard: runCardRead,
            onDisconnect: () => { void closePersistentLive(); },
          }}
        />
      </section>
    </div>
  );
}
