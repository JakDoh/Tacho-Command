// Standard Article 7 screen: 45 minutes, or >=15 followed by >=30.
// Local discontinuities/gaps stop inference; this is not a full compliance verdict.
export function analyzeCardBreaks(days = []) {
  const findings = [];
  let incomplete = false, previous = null, drive = 0, firstPart = false;
  let rest = 0, restApplied = false, start = null, finding = null;
  const reset = () => { drive = 0; firstPart = false; start = null; finding = null; };
  for (const day of [...days].sort((a,b) => String(a.dateIso).localeCompare(String(b.dateIso)))) {
    const base = Date.parse(day.dateIso + 'T00:00:00Z') / 60000;
    const segments = day.segments ?? [];
    let end = -1;
    const invalid = !Number.isFinite(base) || segments.some(s => {
      const bad = !Number.isInteger(s.startMinute) || !Number.isInteger(s.endMinute)
        || s.startMinute < end || s.startMinute < 0 || s.endMinute > 1440
        || s.endMinute <= s.startMinute || s.minutes !== s.endMinute - s.startMinute;
      end = s.endMinute;
      return bad;
    });
    if (invalid) { incomplete = true; reset(); previous = null; rest = 0; restApplied = false; continue; }
    for (const s of segments) {
      const at = base + s.startMinute;
      if (previous !== at) {
        if (previous !== null) incomplete = true;
        reset(); rest = 0; restApplied = false;
      }
      previous = base + s.endMinute;
      if (s.kind === 'rest') {
        rest += s.minutes;
        if (!restApplied && (rest >= 45 || (firstPart && rest >= 30))) {
          reset(); restApplied = true;
        }
        continue;
      }
      if (!restApplied && rest >= 15 && drive > 0) firstPart = true;
      rest = 0; restApplied = false;
      if (!['drive','work','availability'].includes(s.kind)) { incomplete = true; reset(); continue; }
      if (s.kind !== 'drive') continue;
      start ??= {date: day.dateIso, minute: s.startMinute};
      drive += s.minutes;
      if (drive > 270) {
        if (!finding) {
          finding = {startDate: start.date, startMinute: start.minute, date: day.dateIso,
            endMinute: s.endMinute, drivingMinutes: drive, excessMinutes: drive - 270};
          findings.push(finding);
        } else Object.assign(finding, {date: day.dateIso, endMinute: s.endMinute,
          drivingMinutes: drive, excessMinutes: drive - 270});
      }
    }
  }
  return {findings: findings.reverse(), incomplete};
}
