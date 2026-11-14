import { coversActivityRange } from './card-coverage.js';

const MINUTE_MS = 60_000;

export function phoneTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function phoneUtcOffsetLabel(now = new Date()) {
  const minutes = -now.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  return "UTC" + sign + String(Math.floor(absolute / 60)).padStart(2, "0")
    + ":" + String(absolute % 60).padStart(2, "0");
}

function localClockFormatter(timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function localAt(utcMinute, formatter) {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(utcMinute * MINUTE_MS))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    dateIso: parts.year + "-" + parts.month + "-" + parts.day,
    minute: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function offsetLabel(utcMinute, formatter) {
  const local = localAt(utcMinute, formatter);
  const offset = utcMinuteAtDate(local.dateIso) + local.minute - utcMinute;
  return "UTC" + (offset >= 0 ? "+" : "-") + String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0") + ":" + String(Math.abs(offset) % 60).padStart(2, "0");
}
function clockLabel(minute) {
  return String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
}

function utcMinuteAtDate(dateIso) {
  if (typeof dateIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const ms = Date.parse(dateIso + "T00:00:00.000Z");
  return Number.isFinite(ms) ? Math.floor(ms / MINUTE_MS) : null;
}

function ensureDay(map, dateIso) {
  if (!map.has(dateIso)) {
    map.set(dateIso, { dateIso, dateLabel: dateIso, segments: [], events: [] });
  }
  return map.get(dateIso);
}

// Resolve the actual UTC start of a local date; DST days need not have 1440 minutes.
function localDayStart(dateIso, formatter) {
  const nominal = utcMinuteAtDate(dateIso);
  let low = nominal - 2160, high = nominal + 2160;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (localAt(mid, formatter).dateIso < dateIso) low = mid + 1;
    else high = mid;
  }
  return low;
}

function appendSegment(map, localDate, segment) {
  const day = ensureDay(map, localDate);
  const last = day.segments.at(-1);
  if (last && last.kind === segment.kind && last.cardStatus === segment.cardStatus
    && last.label === segment.label && last.endMinute === segment.startMinute
    && last.utcEndMinute === segment.utcStartMinute) {
    last.endMinute = segment.endMinute;
    last.utcEndMinute = segment.utcEndMinute;
    last.minutes += segment.minutes;
  } else day.segments.push({ ...segment });
}

// Project only the display timeline. Raw card dates and activity minutes remain UTC
// in local storage. Historical offsets are resolved for each event, not taken from
// today's offset (important across daylight-saving changes and phone-zone changes).
export function projectCardTimelineForPhone(card, timeZone = phoneTimeZone(), { now = new Date() } = {}) {
  if (!card || typeof card !== "object" || !Array.isArray(card.historyDays)) return card;
  const formatter = localClockFormatter(timeZone);
  const map = new Map();
  const readAt = Date.parse(card.lastCardReadAtIso ?? "");
  const currentTime = now instanceof Date ? now.getTime() : NaN;
  const cutoffMinute = Math.floor(Math.min(
    Number.isFinite(currentTime) ? currentTime : Date.now(),
    Number.isFinite(readAt) ? readAt : Infinity,
  ) / MINUTE_MS);

  for (const day of card.historyDays) {
    const utcDay = utcMinuteAtDate(day?.dateIso ?? day?.dateLabel);
    if (utcDay === null) continue;
    for (const segment of Array.isArray(day.segments) ? day.segments : []) {
      const first = segment?.startMinute, last = segment?.endMinute;
      if (!Number.isInteger(first) || !Number.isInteger(last)
        || first < 0 || last > 1440 || last <= first) continue;
      let cursor = utcDay + first;
      const end = Math.min(utcDay + last, cutoffMinute);
      while (cursor < end) {
        const localStart = localAt(cursor, formatter);
        const lastInstant = localAt(end - 1, formatter);
        let next = end;

        if (lastInstant.dateIso !== localStart.dateIso
          || lastInstant.minute - localStart.minute !== end - cursor - 1) {
          // Find the first local midnight or timezone-offset discontinuity.
          let low = cursor + 1, high = end;
          while (low < high) {
            const mid = Math.floor((low + high) / 2);
            const at = localAt(mid, formatter);
            const contiguous = at.dateIso === localStart.dateIso
              && at.minute - localStart.minute === mid - cursor;
            if (contiguous) low = mid + 1;
            else high = mid;
          }
          next = low;
        }

        if (next <= cursor) throw new Error("Invalid phone-timezone projection boundary");
        appendSegment(map, localStart.dateIso, {
          kind: segment.kind,
          cardStatus: segment.cardStatus ?? null,
          label: segment.label ?? null,
          startMinute: localStart.minute,
          endMinute: localStart.minute + next - cursor,
          minutes: next - cursor,
          utcStartMinute: cursor,
          utcEndMinute: next,
        });
        cursor = next;
      }
    }

    for (const event of Array.isArray(day.events) ? day.events : []) {
      if (!Number.isInteger(event?.minute) || event.minute < 0 || event.minute > 1440
        || utcDay + event.minute > cutoffMinute) continue;
      const local = localAt(utcDay + event.minute, formatter);
      const localDay = ensureDay(map, local.dateIso);
      if (!localDay.events.some((other) => other.kind === event.kind && other.utcMinute === utcDay + event.minute)) {
        localDay.events.push({ kind: event.kind, minute: local.minute, utcMinute: utcDay + event.minute, timeLabel: clockLabel(local.minute) + " " + offsetLabel(utcDay + event.minute, formatter) });
      }
    }
  }

  if (map.size === 0) return Object.freeze({
    ...card,
    historyDays: Object.freeze([]),
    historyDaysAvailable: 0,
  });
  const projected = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([, day]) => {
      const start = localDayStart(day.dateIso, formatter);
      const nextDate = new Date((utcMinuteAtDate(day.dateIso) + 1440) * MINUTE_MS).toISOString().slice(0, 10);
      const fullEnd = localDayStart(nextDate, formatter);
      const end = Math.min(fullEnd, cutoffMinute);
      const timelineMinutes = fullEnd - start;
      const ticks = [];
      for (let instant = start; instant <= fullEnd; instant += 15) {
        const local = localAt(instant, formatter);
        ticks.push(Object.freeze({ minute: instant - start, label: clockLabel(instant === fullEnd ? 1440 : local.minute) + (timelineMinutes !== 1440 ? " " + offsetLabel(instant, formatter) : "") }));
      }
      for (const segment of day.segments) {
        segment.timelineStart = segment.utcStartMinute - start;
        segment.timelineEnd = segment.utcEndMinute - start;
        const offset = timelineMinutes !== 1440 ? " " + offsetLabel(segment.utcStartMinute, formatter) : "";
        segment.timeLabel = clockLabel(segment.startMinute) + "–" + clockLabel(segment.endMinute) + offset;
      }
      const coverageComplete = coversActivityRange(day.segments, start, end,
        (s) => [s.utcStartMinute, s.utcEndMinute]);
      day.segments.sort((a, b) => a.utcStartMinute - b.utcStartMinute);
      day.events.sort((a, b) => a.utcMinute - b.utcMinute);
      return Object.freeze({
        dateIso: day.dateIso,
        dateLabel: day.dateLabel,
        coverageComplete,
        timelineMinutes,
        timelineTicks: Object.freeze(ticks),
        drivingMinutes: day.segments.filter((item) => item.kind === "drive")
          .reduce((sum, item) => sum + item.minutes, 0),
        segments: Object.freeze(day.segments.map((segment) => Object.freeze(segment))),
        events: Object.freeze(day.events.map((event) => Object.freeze(event))),
      });
    }).slice(-56);

  return Object.freeze({
    ...card,
    historyDays: Object.freeze(projected),
    historyDaysAvailable: projected.length,
    // Preserve the canonical driving-time aggregate: moving day boundaries
    // in the display must not silently change a compliance value.
    fortnightDrivingMinutes: card.fortnightDrivingMinutes,
  });
}
