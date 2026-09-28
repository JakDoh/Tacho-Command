const ACTIVITY_KIND = Object.freeze({
  rest: "rest",
  availability: "availability",
  work: "work",
  driving: "drive",
  drive: "drive",
});

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(value + "T00:00:00.000Z");
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10) === value ? value : null;
}

function minute(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 1440 ? parsed : null;
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function consecutiveCalendarDays(previousDateIso, currentDateIso) {
  const previous = Date.parse(previousDateIso + "T00:00:00.000Z");
  const current = Date.parse(currentDateIso + "T00:00:00.000Z");
  return current - previous === 24 * 60 * 60 * 1000;
}

function previousWeekMonday(dateIso) {
  const timestamp = Date.parse(dateIso + "T00:00:00.000Z");
  const date = new Date(timestamp);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(timestamp - (daysSinceMonday + 7) * 86400000)
    .toISOString()
    .slice(0, 10);
}

function normalizeSegment(segment) {
  if (!plainObject(segment)) return null;
  const startMinute = minute(segment.startMinute);
  const endMinute = minute(segment.endMinute);
  const rawKind = typeof segment.activity === "string" ? segment.activity : segment.kind;
  const kind = ACTIVITY_KIND[rawKind] ?? null;
  const cardStatus = segment.cardStatus === "inserted" || segment.cardStatus === "not-inserted"
    ? segment.cardStatus
    : null;

  if (startMinute === null || endMinute === null || endMinute <= startMinute || !kind) return null;

  return Object.freeze({
    kind,
    minutes: endMinute - startMinute,
    startMinute,
    endMinute,
    cardStatus,
    label: cleanString(segment.label, 64),
  });
}

function normalizeDay(day) {
  if (!plainObject(day)) return null;
  const dateIso = isoDate(day.date ?? day.dateIso);
  if (!dateIso || !Array.isArray(day.segments)) return null;

  const segments = day.segments.map(normalizeSegment);
  if (segments.some((segment) => segment === null)) return null;

  const ordered = [...segments].sort((left, right) =>
    left.startMinute - right.startMinute || left.endMinute - right.endMinute
  );

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (current.startMinute < previous.endMinute) return null;
    if (current.startMinute === previous.startMinute) return null;
  }

  const drivingMinutes = ordered
    .filter((segment) => segment.kind === "drive")
    .reduce((sum, segment) => sum + segment.minutes, 0);

  const events = [];
  const seenEvents = new Set();
  const addEvent = (kind, eventMinute) => {
    const normalizedMinute = minute(eventMinute);
    if (normalizedMinute === null) return;
    const key = kind + ":" + normalizedMinute;
    if (seenEvents.has(key)) return;
    seenEvents.add(key);
    events.push(Object.freeze({ kind, minute: normalizedMinute }));
  };

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.cardStatus === "not-inserted" && current.cardStatus === "inserted") {
      addEvent("card-inserted", current.startMinute);
    } else if (previous.cardStatus === "inserted" && current.cardStatus === "not-inserted") {
      addEvent("card-removed", current.startMinute);
    }
  }

  events.sort((left, right) => left.minute - right.minute);

  return Object.freeze({
    dateIso,
    dateLabel: cleanString(day.dateLabel, 32) ?? dateIso,
    drivingMinutes,
    segments: Object.freeze(ordered),
    events: Object.freeze(events),
  });
}

export function normalizeParserCardResult(input = {}) {
  if (!plainObject(input) || input.complete !== true || !Array.isArray(input.days)) return null;

  const normalizedDays = input.days.map(normalizeDay);
  if (normalizedDays.some((day) => day === null)) return null;

  const orderedDays = [...normalizedDays].sort((left, right) => left.dateIso.localeCompare(right.dateIso));
  for (let index = 1; index < orderedDays.length; index += 1) {
    if (orderedDays[index - 1].dateIso === orderedDays[index].dateIso) return null;
  }

  const limitedDays = orderedDays.slice(-56);
  for (let index = 1; index < limitedDays.length; index += 1) {
    if (!consecutiveCalendarDays(limitedDays[index - 1].dateIso, limitedDays[index].dateIso)) {
      return null;
    }
  }

  // "Dve nedelje" is the previous calendar week plus the elapsed part of the
  // current one. For a Tuesday read this is Monday last week through Tuesday
  // this week (9 days), rather than an arbitrary rolling 14-day window.
  const rangeEndIso = limitedDays.at(-1)?.dateIso ?? null;
  const periodStartIso = rangeEndIso ? previousWeekMonday(rangeEndIso) : null;
  const calendarFortnight = periodStartIso
    ? limitedDays.filter((day) => day.dateIso >= periodStartIso && day.dateIso <= rangeEndIso)
    : [];
  const fortnightDrivingMinutes = calendarFortnight.reduce((sum, day) => sum + day.drivingMinutes, 0);

  return Object.freeze({
    driverName: cleanString(input.driverName, 96),
    cardLast4: input.cardLast4 ?? null,
    cardReadComplete: true,
    historyDaysAvailable: limitedDays.length,
    fortnightDrivingMinutes,
    historyDays: Object.freeze(limitedDays),
    historyRangeStartIso: limitedDays[0]?.dateIso ?? null,
    historyRangeEndIso: rangeEndIso,
    attentionTitle: cleanString(input.attentionTitle, 140),
    attentionBody: cleanString(input.attentionBody, 360),
    slotLabel: cleanString(input.slotLabel, 64),
  });
}
