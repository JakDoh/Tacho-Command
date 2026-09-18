export const LAST_GOOD_CARD_SNAPSHOT_SCHEMA = "tc-card-snapshot-v1";
export const LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY = "tachocommand.last-good-card-snapshot.v1";
export const LAST_GOOD_CARD_SNAPSHOT_MAX_DAYS = 56;

const HISTORY_KINDS = Object.freeze(["drive", "work", "availability", "rest"]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedInteger(value, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function nonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function trimmedString(value, maxLength) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizedCardLast4(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function isoDate(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!ISO_DATE_PATTERN.test(normalized)) return null;
  const parsed = Date.parse(normalized + "T00:00:00.000Z");
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10) === normalized ? normalized : null;
}

function isoInstant(value) {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function normalizeSegment(segment) {
  if (!plainObject(segment)) return null;
  const kind = typeof segment.kind === "string" && HISTORY_KINDS.includes(segment.kind)
    ? segment.kind
    : null;
  const minutes = nonNegativeNumber(segment.minutes);
  if (!kind || minutes === null) return null;
  return Object.freeze({ kind, minutes });
}

function normalizeHistoryDay(day) {
  if (!plainObject(day)) return null;
  const dateLabel = trimmedString(day.dateLabel, 32);
  const dateIso = day.dateIso === null || day.dateIso === undefined ? null : isoDate(day.dateIso);
  const drivingMinutes = nonNegativeNumber(day.drivingMinutes);
  if (!dateLabel || drivingMinutes === null) return null;
  if (day.dateIso !== null && day.dateIso !== undefined && !dateIso) return null;
  if (!Array.isArray(day.segments)) return null;

  const segments = day.segments.map(normalizeSegment);
  if (segments.some((segment) => segment === null)) return null;

  return Object.freeze({
    dateIso,
    dateLabel,
    drivingMinutes: Math.round(drivingMinutes),
    segments: Object.freeze(segments),
  });
}

function deriveHistoryRange(days, explicitStart, explicitEnd) {
  const start = explicitStart === null || explicitStart === undefined ? null : isoDate(explicitStart);
  const end = explicitEnd === null || explicitEnd === undefined ? null : isoDate(explicitEnd);
  if (explicitStart !== null && explicitStart !== undefined && !start) return null;
  if (explicitEnd !== null && explicitEnd !== undefined && !end) return null;
  if (start && end && start > end) return null;

  const dated = days.map((day) => day.dateIso).filter(Boolean).sort();
  const derivedStart = dated.length ? dated[0] : null;
  const derivedEnd = dated.length ? dated[dated.length - 1] : null;

  const rangeStartIso = start ?? derivedStart;
  const rangeEndIso = end ?? derivedEnd;
  if (rangeStartIso && rangeEndIso && rangeStartIso > rangeEndIso) return null;

  return Object.freeze({ rangeStartIso, rangeEndIso });
}

function normalizeCompleteCardState(input) {
  if (!plainObject(input) || input.cardReadComplete !== true) return null;
  if (!Array.isArray(input.historyDays) || input.historyDays.length > LAST_GOOD_CARD_SNAPSHOT_MAX_DAYS) return null;

  const historyDays = input.historyDays.map(normalizeHistoryDay);
  if (historyDays.some((day) => day === null)) return null;

  const historyDaysAvailable = boundedInteger(
    input.historyDaysAvailable ?? historyDays.length,
    0,
    LAST_GOOD_CARD_SNAPSHOT_MAX_DAYS,
  );
  if (historyDaysAvailable === null) return null;
  if (historyDaysAvailable > 0 && historyDays.length === 0) return null;

  const fortnightDrivingMinutes = input.fortnightDrivingMinutes === null || input.fortnightDrivingMinutes === undefined
    ? null
    : nonNegativeNumber(input.fortnightDrivingMinutes);
  if (input.fortnightDrivingMinutes !== null && input.fortnightDrivingMinutes !== undefined && fortnightDrivingMinutes === null) {
    return null;
  }

  const range = deriveHistoryRange(
    historyDays,
    input.historyRangeStartIso,
    input.historyRangeEndIso,
  );
  if (!range) return null;

  return Object.freeze({
    driverName: trimmedString(input.driverName, 96),
    cardLast4: normalizedCardLast4(input.cardLast4),
    cardReadComplete: true,
    historyDaysAvailable,
    fortnightDrivingMinutes: fortnightDrivingMinutes === null ? null : Math.round(fortnightDrivingMinutes),
    historyDays: Object.freeze(historyDays),
    historyRangeStartIso: range.rangeStartIso,
    historyRangeEndIso: range.rangeEndIso,
    attentionTitle: trimmedString(input.attentionTitle, 140),
    attentionBody: trimmedString(input.attentionBody, 360),
    slotLabel: trimmedString(input.slotLabel, 64),
  });
}

export function createLastGoodCardSnapshot(cardState, capturedAtIso = new Date().toISOString()) {
  const capturedAt = isoInstant(capturedAtIso);
  const card = normalizeCompleteCardState(cardState);
  if (!capturedAt || !card) return null;

  return Object.freeze({
    schema: LAST_GOOD_CARD_SNAPSHOT_SCHEMA,
    capturedAtIso: capturedAt,
    card,
  });
}

export function saveLastGoodCardSnapshot(storage, cardState, capturedAtIso = new Date().toISOString()) {
  if (!storage || typeof storage.setItem !== "function") {
    return Object.freeze({ status: "storage_unavailable", snapshot: null });
  }

  const snapshot = createLastGoodCardSnapshot(cardState, capturedAtIso);
  if (!snapshot) {
    return Object.freeze({ status: "rejected_incomplete", snapshot: null });
  }

  try {
    storage.setItem(LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    return Object.freeze({ status: "saved", snapshot });
  } catch {
    return Object.freeze({ status: "storage_error", snapshot: null });
  }
}

export function loadLastGoodCardSnapshot(storage) {
  if (!storage || typeof storage.getItem !== "function") return null;

  try {
    const raw = storage.getItem(LAST_GOOD_CARD_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!plainObject(parsed) || parsed.schema !== LAST_GOOD_CARD_SNAPSHOT_SCHEMA) return null;

    const capturedAtIso = isoInstant(parsed.capturedAtIso);
    const card = normalizeCompleteCardState(parsed.card);
    if (!capturedAtIso || !card) return null;

    return Object.freeze({
      schema: LAST_GOOD_CARD_SNAPSHOT_SCHEMA,
      capturedAtIso,
      card,
    });
  } catch {
    return null;
  }
}

export function cardStateFromLastGoodCardSnapshot(snapshot) {
  if (!plainObject(snapshot) || snapshot.schema !== LAST_GOOD_CARD_SNAPSHOT_SCHEMA) return null;
  const capturedAtIso = isoInstant(snapshot.capturedAtIso);
  const card = normalizeCompleteCardState(snapshot.card);
  if (!capturedAtIso || !card) return null;

  return Object.freeze({
    ...card,
    lastCardReadAtIso: capturedAtIso,
  });
}
