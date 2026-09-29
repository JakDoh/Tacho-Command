import { analyzeCardBreaks } from './card-break-analysis.js';

function localInstant(epochMs, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit',
    hourCycle:'h23', timeZoneName:'shortOffset',
  }).formatToParts(new Date(epochMs)).map(p => [p.type,p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour)*60+Number(parts.minute),
    label: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.timeZoneName}` };
}
const instant = (date, minute) => Date.parse(date+'T00:00:00Z')+minute*60000;

// Only labels are localized. Calculations always use the unprojected UTC card.
export function reviewUtcCardBreaks(card, timeZone = 'UTC') {
  const analysis = analyzeCardBreaks(card?.historyDays ?? []);
  return { ...analysis, findings: analysis.findings.map(f => {
    const start = localInstant(instant(f.startDate, f.startMinute),timeZone);
    const end = localInstant(instant(f.date,f.endMinute),timeZone);
    return {...f, startDate:start.date, startMinute:start.minute, date:end.date, endMinute:end.minute,
      startLabel:start.label, endLabel:end.label};
  }) };
}

export function exportUtcCardCsv(card, timeZone = 'UTC', saved = true) {
  const rows = [
    ['TachoCommand user overview — not official DDD'],
    ['Time zone',timeZone],
    ['Data cutoff (UTC)',card?.lastCardReadAtIso ?? ''],
    ['Stored on this device',saved ? 'yes' : 'no'],
    ['Activity','UTC start','UTC end','Local start (offset)','Local end (offset)','Elapsed minutes'],
  ];
  for (const day of card?.historyDays ?? []) for (const s of day.segments ?? []) {
    if (!Number.isInteger(s.startMinute) || !Number.isInteger(s.endMinute)) continue;
    const start = instant(day.dateIso,s.startMinute), end = instant(day.dateIso,s.endMinute);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    rows.push([s.kind,new Date(start).toISOString(),new Date(end).toISOString(),
      localInstant(start,timeZone).label,localInstant(end,timeZone).label,s.minutes]);
  }
  const quote = value => '"'+String(value??'').replaceAll('"','""')+'"';
  return '\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n');
}
