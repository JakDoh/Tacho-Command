// Technical metadata only. Never accept packet bodies, device names or card data.
export function createCardTransportTrace(now = () => performance.now()) {
  const startedAt = now();
  const events = [];
  const milestones = [];
  let totalEvents = 0;
  return Object.freeze({
    add(event, fields = {}) {
      const entry = { ms: Math.round(now() - startedAt), event };
      for (const key of ['id', 'count', 'sequence', 'total', 'size', 'sid', 'nrc', 'counter']) {
        if (Number.isFinite(fields[key])) entry[key] = fields[key];
      }
      events.push(Object.freeze(entry));
      totalEvents += 1;
      if (events.length > 256) events.shift();
      if (event.startsWith('stage:') && milestones.length < 40 && milestones.at(-1)?.event !== event) milestones.push(entry);
    },
    snapshot() {
      return Object.freeze({ events: Object.freeze([...events]), milestones: Object.freeze([...milestones]), droppedEvents: totalEvents - events.length });
    },
  });
}
