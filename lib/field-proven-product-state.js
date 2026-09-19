import { normalizeTechnicalTelemetryAttemptCode } from "./technical-telemetry.js";

const ACTIVITY_MAP = Object.freeze({
  drive: "DRIVING",
  driving: "DRIVING",
  work: "WORK",
  availability: "AVAILABILITY",
  available: "AVAILABILITY",
  rest: "REST",
  break: "REST",
  unknown: "UNKNOWN",
});

const HISTORY_KINDS = Object.freeze(["drive", "work", "availability", "rest"]);
const HISTORY_EVENT_KINDS = Object.freeze(["card-inserted", "card-removed"]);

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nonNegativeNumber(value) {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function nullableMinutesFromSeconds(value) {
  const seconds = nonNegativeNumber(value);
  return seconds === null ? null : Math.round(seconds / 60);
}

function boundedInteger(value, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

function minuteOfDay(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 1440 ? parsed : null;
}

function historyCardStatus(value) {
  return value === "inserted" || value === "not-inserted" ? value : null;
}

function trimmedString(value, maxLength = 120) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function cardLast4(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function normalizeActivity(value) {
  if (typeof value !== "string") return "UNKNOWN";
  const normalized = value.trim().toLowerCase();
  return ACTIVITY_MAP[normalized] ?? "UNKNOWN";
}

function formatMinutesCompact(value) {
  const minutes = nonNegativeNumber(value);
  if (minutes === null) return null;
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours > 0
    ? hours + " h " + String(remainder).padStart(2, "0") + " min"
    : remainder + " min";
}

function normalizeHistoryDay(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const dateLabel = trimmedString(input.dateLabel, 32);
  const drivingMinutes = nonNegativeNumber(input.drivingMinutes);
  if (!dateLabel || drivingMinutes === null) return null;

  const rawSegments = Array.isArray(input.segments) ? input.segments : [];
  const normalizedSegments = [];
  for (const segment of rawSegments) {
    if (!segment || typeof segment !== "object" || Array.isArray(segment)) continue;
    const rawKind = typeof segment.kind === "string"
      ? segment.kind
      : typeof segment.activity === "string"
        ? segment.activity
        : null;
    const kind = rawKind === "driving"
      ? "drive"
      : rawKind && HISTORY_KINDS.includes(rawKind)
        ? rawKind
        : null;
    const rawMinutes = nonNegativeNumber(segment.minutes ?? segment.durationMinutes);
    if (!kind || rawMinutes === null) continue;

    const roundedMinutes = Math.round(rawMinutes);
    const explicitStart = segment.startMinute === null || segment.startMinute === undefined ? null : minuteOfDay(segment.startMinute);
    const explicitEnd = segment.endMinute === null || segment.endMinute === undefined ? null : minuteOfDay(segment.endMinute);
    if (segment.startMinute !== null && segment.startMinute !== undefined && explicitStart === null) continue;
    if (segment.endMinute !== null && segment.endMinute !== undefined && explicitEnd === null) continue;

    if ((explicitStart === null) !== (explicitEnd === null)) continue;

    let startMinute = null;
    let endMinute = null;
    let minutes = roundedMinutes;
    if (explicitStart !== null && explicitEnd !== null) {
      if (explicitEnd < explicitStart) continue;
      const positionedMinutes = explicitEnd - explicitStart;
      if (Math.abs(positionedMinutes - roundedMinutes) > 1) continue;
      startMinute = explicitStart;
      endMinute = explicitEnd;
      minutes = positionedMinutes;
    }

    normalizedSegments.push(Object.freeze({
      kind,
      minutes,
      startMinute,
      endMinute,
      cardStatus: historyCardStatus(segment.cardStatus),
      label: trimmedString(segment.label, 64),
    }));
  }

  const timingComplete = normalizedSegments.length > 0 && normalizedSegments.every(
    (segment) => segment.startMinute !== null && segment.endMinute !== null,
  );
  const totalMinutes = normalizedSegments.reduce((sum, segment) => sum + segment.minutes, 0);
  const activityTotals = Object.freeze({
    drive: normalizedSegments.filter((segment) => segment.kind === "drive").reduce((sum, segment) => sum + segment.minutes, 0),
    work: normalizedSegments.filter((segment) => segment.kind === "work").reduce((sum, segment) => sum + segment.minutes, 0),
    availability: normalizedSegments.filter((segment) => segment.kind === "availability").reduce((sum, segment) => sum + segment.minutes, 0),
    rest: normalizedSegments.filter((segment) => segment.kind === "rest").reduce((sum, segment) => sum + segment.minutes, 0),
  });

  const segments = normalizedSegments.map((segment) => Object.freeze({
    ...segment,
    percent: totalMinutes > 0 ? (segment.minutes / totalMinutes) * 100 : 0,
  }));

  const events = [];
  const seenEvents = new Set();
  const addEvent = (kind, minute) => {
    if (!HISTORY_EVENT_KINDS.includes(kind)) return;
    const normalizedMinute = minuteOfDay(minute);
    if (normalizedMinute === null) return;
    const key = kind + ":" + String(normalizedMinute);
    if (seenEvents.has(key)) return;
    seenEvents.add(key);
    events.push(Object.freeze({ kind, minute: normalizedMinute }));
  };

  if (Array.isArray(input.events)) {
    for (const event of input.events) {
      if (!event || typeof event !== "object" || Array.isArray(event)) continue;
      addEvent(event.kind, event.minute);
    }
  }
  addEvent("card-inserted", input.cardInsertedMinute);
  addEvent("card-removed", input.cardRemovedMinute);

  for (let index = 1; index < normalizedSegments.length; index += 1) {
    const previous = normalizedSegments[index - 1];
    const current = normalizedSegments[index];
    if (current.startMinute === null) continue;
    if (previous.cardStatus === "not-inserted" && current.cardStatus === "inserted") addEvent("card-inserted", current.startMinute);
    else if (previous.cardStatus === "inserted" && current.cardStatus === "not-inserted") addEvent("card-removed", current.startMinute);
  }

  events.sort((left, right) => left.minute - right.minute);
  return Object.freeze({
    dateLabel,
    drivingMinutes: Math.round(drivingMinutes),
    activityTotals,
    timingComplete,
    events: Object.freeze(events),
    segments: Object.freeze(segments),
  });
}

function continuousContext(minutes, profile) {
  const threshold = nonNegativeNumber(profile?.continuousThresholdMinutes);
  const warning = nonNegativeNumber(profile?.continuousWarningMinutes);

  if (minutes === null || threshold === null || threshold <= 0) {
    return Object.freeze({
      progressPercent: null,
      remainingLabel: null,
      thresholdLabel: threshold === null ? null : formatMinutesCompact(threshold),
      band: "neutral",
    });
  }

  const progressPercent = Math.min(100, Math.max(0, (minutes / threshold) * 100));
  const remainingLabel = formatMinutesCompact(Math.max(0, threshold - minutes));
  const band = minutes >= threshold
    ? "limit"
    : warning !== null && minutes >= warning
      ? "warning"
      : "safe";

  return Object.freeze({
    progressPercent,
    remainingLabel,
    thresholdLabel: formatMinutesCompact(threshold),
    band,
  });
}

export function createFieldProvenProductState(input = {}) {
  const live = input.live && typeof input.live === "object" ? input.live : {};
  const card = input.card && typeof input.card === "object" ? input.card : {};
  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};

  const connected = live.connected === true;
  const snapshotConfirmed = connected || live.snapshotConfirmed === true;
  const continuousDrivingMinutes = nullableMinutesFromSeconds(live.continuousDrivingSec);
  const continuous = continuousContext(continuousDrivingMinutes, profile);

  const historyDays = (Array.isArray(card.historyDays) ? card.historyDays : [])
    .slice(0, 56)
    .map(normalizeHistoryDay)
    .filter(Boolean);

  const historyDaysAvailable = boundedInteger(
    card.historyDaysAvailable ?? historyDays.length,
    0,
    56,
  ) ?? Math.min(56, historyDays.length);

  const telemetryAcceptedCount = boundedInteger(live.telemetryAcceptedCount, 0, 1000000);
  const attemptCode = normalizeTechnicalTelemetryAttemptCode(live.attemptCode);

  return Object.freeze({
    live: connected,
    liveSnapshotAvailable: snapshotConfirmed,
    driverName: trimmedString(card.driverName, 96),
    cardLast4: cardLast4(card.cardLast4),
    tachographLabel: trimmedString(live.deviceLabel, 96),
    lastLiveReadLabel: trimmedString(live.lastLiveReadLabel, 48),
    currentActivity: snapshotConfirmed ? normalizeActivity(live.activity) : "UNKNOWN",
    continuousDrivingMinutes: snapshotConfirmed ? continuousDrivingMinutes : null,
    continuousProgressPercent: snapshotConfirmed ? continuous.progressPercent : null,
    continuousRemainingLabel: snapshotConfirmed ? continuous.remainingLabel : null,
    continuousThresholdLabel: snapshotConfirmed ? continuous.thresholdLabel : null,
    continuousBand: snapshotConfirmed ? continuous.band : "neutral",
    todayDrivingMinutes: snapshotConfirmed ? nullableMinutesFromSeconds(live.dailyDrivingSec) : null,
    weekDrivingMinutes: snapshotConfirmed ? nullableMinutesFromSeconds(live.weeklyDrivingSec) : null,
    fortnightDrivingMinutes: nonNegativeNumber(card.fortnightDrivingMinutes) === null
      ? null
      : Math.round(nonNegativeNumber(card.fortnightDrivingMinutes)),
    historyDaysAvailable,
    historyDays: Object.freeze(historyDays),
    attentionTitle: trimmedString(card.attentionTitle, 140),
    attentionBody: trimmedString(card.attentionBody, 360),
    cardReadComplete: card.cardReadComplete === true,
    slotLabel: trimmedString(card.slotLabel, 64),
    telemetrySentCount: telemetryAcceptedCount,
    attemptCode,
    localeLabel: trimmedString(input.localeLabel, 48) ?? "SR · Srpski",
  });
}

export function createFieldProvenLiveSnapshot(input = {}) {
  return Object.freeze({
    connected: input.connected === true,
    deviceLabel: trimmedString(input.deviceLabel, 96),
    lastLiveReadLabel: trimmedString(input.lastLiveReadLabel, 48),
    activity: normalizeActivity(input.activity),
    continuousDrivingSec: nonNegativeNumber(input.continuousDrivingSec),
    dailyDrivingSec: nonNegativeNumber(input.dailyDrivingSec),
    weeklyDrivingSec: nonNegativeNumber(input.weeklyDrivingSec),
    telemetryAcceptedCount: boundedInteger(input.telemetryAcceptedCount, 0, 1000000),
    attemptCode: normalizeTechnicalTelemetryAttemptCode(input.attemptCode),
  });
}
