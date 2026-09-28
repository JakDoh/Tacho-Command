export const CARD_LOCAL_TIME_ZONE = "Europe/Vienna";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function cardUtcMinuteEpoch(dateIso, minute) {
  if (typeof dateIso !== "string" || !Number.isInteger(minute) || minute < 0 || minute > 1440) return null;
  const match = DATE_PATTERN.exec(dateIso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dayEpoch = Date.UTC(year, month - 1, day);
  const parsed = new Date(dayEpoch);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return dayEpoch + minute * 60_000;
}

export function cardLocalDateIso(epochMs, timeZone = CARD_LOCAL_TIME_ZONE) {
  if (!Number.isFinite(epochMs)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(epochMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year && values.month && values.day
    ? values.year + "-" + values.month + "-" + values.day
    : null;
}

export function formatCardLocalTime(epochMs, timeZone = CARD_LOCAL_TIME_ZONE) {
  if (!Number.isFinite(epochMs)) return null;
  return new Intl.DateTimeFormat("sr-RS", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(epochMs));
}
