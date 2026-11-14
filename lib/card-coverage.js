// Coverage is evidence about known activity, not a legal compliance verdict.
export function coversActivityRange(segments, start, end, bounds = (s) => [s.startMinute, s.endMinute]) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return false;
  const intervals = [];
  for (const segment of segments ?? []) {
    const [from, to] = bounds(segment);
    if (!['drive', 'driving', 'rest', 'work', 'availability'].includes(segment.kind ?? segment.activity)
      || !Number.isInteger(from) || !Number.isInteger(to) || to <= from) return false;
    if (to > start && from < end) intervals.push([Math.max(start, from), Math.min(end, to)]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let cursor = start;
  for (const [from, to] of intervals) {
    // Neither a gap nor an overlap can certify complete coverage.
    if (from !== cursor) return false;
    cursor = to;
  }
  return cursor === end;
}
