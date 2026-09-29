// Rows arrive newest first. Only allow-listed technical fields reach the admin UI.
export function summarizeCardAttempts(rows, nowSeconds = Math.floor(Date.now() / 1000)) {
  const attempts = new Map();
  for (const row of rows) {
    if (!/^TC-[A-HJKMNP-Z2-9]{6}$/.test(row.attemptCode ?? "")) continue;
    let item = attempts.get(row.attemptCode);
    if (!item) {
      item = {
        attemptCode: row.attemptCode,
        startedAt: row.createdAt,
        lastAt: row.createdAt,
        packetCount: 0,
        byteCount: 0,
        stage: null,
        lastConfirmedStage: null,
        errorCode: null,
        nrc: null,
        status: "no_terminal_event",
        events: [],
      };
      attempts.set(row.attemptCode, item);
    }
    item.startedAt = Math.min(item.startedAt, row.createdAt);
    item.packetCount = Math.max(item.packetCount, row.packetCount ?? 0);
    item.byteCount = Math.max(item.byteCount, row.byteCount ?? 0);
    if (!item.stage && row.stage) item.stage = row.stage;
    if (!item.lastConfirmedStage && row.lastConfirmedStage) item.lastConfirmedStage = row.lastConfirmedStage;
    if (!item.errorCode && row.errorCode) item.errorCode = row.errorCode;
    if (item.nrc == null && row.nrc != null) item.nrc = row.nrc;
    if (item.events.length < 8) item.events.push({
      event: row.event, at: row.createdAt,
      packetCount: row.packetCount ?? 0,
      stage: row.stage ?? null,
      errorCode: row.errorCode ?? null,
    });
    if (item.status === "no_terminal_event") {
      if (row.event === "card_pipeline_complete") item.status = "complete";
      else if (row.event === "card_transfer_error" || row.event === "card_pipeline_error") item.status = "failed";
      else if (row.event === "card_transfer_complete") item.status = "transfer_complete";
    }
  }
  return Array.from(attempts.values()).map((item) => ({
    ...item,
    status: item.status === "no_terminal_event" && nowSeconds - item.lastAt < 120
      ? "in_progress" : item.status,
  }));
}
