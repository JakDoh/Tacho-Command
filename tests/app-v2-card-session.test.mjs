import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptAppV2CardRead,
  beginAppV2CardRead,
  createAppV2CardSession,
  failAppV2CardRead,
} from "../lib/app-v2-card-session.js";

const previousCard = Object.freeze({
  cardReadComplete: true,
  historyDaysAvailable: 56,
  historyDays: Object.freeze([{ dateLabel: "18.09.", drivingMinutes: 60, segments: Object.freeze([]), events: Object.freeze([]) }]),
  lastCardReadAtIso: "2026-09-12T08:00:00.000Z",
});

test("card session preserves the previous good card while a new full read is in progress", () => {
  const idle = createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  });

  const reading = beginAppV2CardRead(idle);

  assert.equal(reading.phase, "reading");
  assert.equal(reading.busy, true);
  assert.equal(reading.currentCard, previousCard);
  assert.equal(reading.capturedAtIso, "2026-09-12T08:00:00.000Z");
});

test("failed card read keeps the previous good card and timestamp intact", () => {
  const reading = beginAppV2CardRead(createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  }));

  const failed = failAppV2CardRead(reading, "Parser nije potvrdio novo očitavanje.");

  assert.equal(failed.phase, "error");
  assert.equal(failed.currentCard, previousCard);
  assert.equal(failed.capturedAtIso, "2026-09-12T08:00:00.000Z");
  assert.match(failed.errorText, /Parser/);
});

test("accepted card read atomically replaces the previous card only after pipeline acceptance", () => {
  const reading = beginAppV2CardRead(createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  }));

  const newCard = Object.freeze({
    cardReadComplete: true,
    historyDaysAvailable: 56,
    historyDays: Object.freeze([]),
    lastCardReadAtIso: "2026-09-19T09:40:00.000Z",
  });

  const accepted = acceptAppV2CardRead(reading, {
    status: "accepted",
    card: newCard,
    snapshot: { capturedAtIso: "2026-09-19T09:40:00.000Z" },
  });

  assert.equal(accepted.phase, "accepted");
  assert.equal(accepted.currentCard, newCard);
  assert.equal(accepted.capturedAtIso, "2026-09-19T09:40:00.000Z");
});

test("card session refuses to replace state with a rejected pipeline result", () => {
  const reading = beginAppV2CardRead(createAppV2CardSession({
    currentCard: previousCard,
    capturedAtIso: previousCard.lastCardReadAtIso,
  }));

  assert.equal(acceptAppV2CardRead(reading, {
    status: "parser_error",
    card: null,
    snapshot: null,
  }), null);
});
