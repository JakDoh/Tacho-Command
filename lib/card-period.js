export function calendarCardPeriod(
  days,
  {
    now = new Date(),
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  } = {},
) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const end = `${parts.year}-${parts.month}-${parts.day}`;
  const epoch = Date.parse(end + "T00:00:00Z");
  const begin =
    epoch - (((new Date(epoch).getUTCDay() + 6) % 7) + 7) * 86400000;
  const start = new Date(begin).toISOString().slice(0, 10);
  const expectedDays = Math.round((epoch - begin) / 86400000) + 1;
  const selected = (days ?? []).filter(
    (d) => d.dateIso >= start && d.dateIso <= end,
  );
  const dates = new Set(selected.map((d) => d.dateIso));
  const complete =
    dates.size === expectedDays && selected.length === dates.size;
  const valid = selected.every(
    (d) =>
      typeof d.drivingMinutes === "number" &&
      Number.isFinite(d.drivingMinutes) &&
      d.drivingMinutes >= 0,
  );
  return Object.freeze({
    start,
    end,
    expectedDays,
    availableDays: dates.size,
    complete: complete && valid,
    minutes:
      complete && valid
        ? selected.reduce((sum, d) => sum + d.drivingMinutes, 0)
        : null,
  });
}
