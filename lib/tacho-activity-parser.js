/**
 * TachoCommand — EF_Driver_Activity_Data (0x0504) Parser & Rules Integrator
 * According to Annex 1C / Annex 1B (EU 2016/799 & 2021/1228, Appendix 1a / Appendix 2)
 */

export const ACTIVITY_REST = 0;
export const ACTIVITY_AVAILABILITY = 1;
export const ACTIVITY_WORK = 2;
export const ACTIVITY_DRIVING = 3;

/**
 * Rozkóduje 16-bitové slovo ActivityChangeInfo
 */
export function decodeActivityChangeInfo(word) {
  return {
    slot: (word >>> 15) & 0x01, // 0 = Driver, 1 = Co-driver
    drivingStatus: (word >>> 14) & 0x01, // 0 = Single, 1 = Crew
    cardStatus: (word >>> 13) & 0x01, // 0 = Inserted, 1 = Not inserted
    activity: (word >>> 11) & 0x03, // 0 = Rest, 1 = Avail, 2 = Work, 3 = Drive
    timeMinutes: word & 0x07ff, // 0..1439
  };
}

/**
 * Naparsuje obsah EF_Driver_Activity_Data (0x0504) na chronologické denní záznamy
 */
export function parseDriverActivityData(rawBytes) {
  const bytes = rawBytes instanceof Uint8Array ? rawBytes : Uint8Array.from(rawBytes ?? []);
  if (bytes.length < 8) return [];

  // Prvních 8 bajtů je oldestUpdate (4B) a newestUpdate (4B) TimeReal
  const dailyRecords = [];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const prevLength = (bytes[offset] << 8) | bytes[offset + 1];
    const recordLength = (bytes[offset + 2] << 8) | bytes[offset + 3];

    // Neplatný nebo prázdný cyklický záznam
    if (recordLength < 12 || offset + recordLength > bytes.length) {
      break;
    }

    const timestamp =
      (bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7];
    const presenceCounter = (bytes[offset + 8] << 8) | bytes[offset + 9];
    const dayDistance = (bytes[offset + 10] << 8) | bytes[offset + 11];

    const changeCount = Math.floor((recordLength - 12) / 2);
    const changes = [];

    for (let i = 0; i < changeCount; i++) {
      const idx = offset + 12 + i * 2;
      const word = (bytes[idx] << 8) | bytes[idx + 1];
      changes.push(decodeActivityChangeInfo(word));
    }

    // Seřadit změny vzestupně podle času v daném dni
    changes.sort((a, b) => a.timeMinutes - b.timeMinutes);

    dailyRecords.push({
      date: new Date(timestamp * 1000),
      timestamp,
      presenceCounter,
      dayDistanceKm: dayDistance,
      changes,
    });

    offset += recordLength;
  }

  // Seřadit dny chronologicky
  return dailyRecords.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Spočítá DrivingSnapshot pro lib/tacho-rules.js z chronologických denních záznamů
 */
export function calculateDrivingSnapshotFromCard(dailyRecords) {
  if (!dailyRecords || dailyRecords.length === 0) {
    return {
      continuousDriveSeconds: 0,
      dailyDriveSeconds: 0,
      weeklyDriveSeconds: 0,
      fortnightlyDriveSeconds: 0,
      currentBreakSeconds: 0,
      previousSplitBreakSeconds: 0,
      useDailyExtension: false,
    };
  }

  // Vytvoříme minutové bloky pro poslední den a týdny
  const latestDay = dailyRecords[dailyRecords.length - 1];
  let dailyDriveMinutes = 0;

  // Spočítáme minuty v rámci posledního aktivního dne
  for (let i = 0; i < latestDay.changes.length; i++) {
    const current = latestDay.changes[i];
    const nextTime =
      i + 1 < latestDay.changes.length ? latestDay.changes[i + 1].timeMinutes : 1440;
    const duration = Math.max(0, nextTime - current.timeMinutes);

    if (current.activity === ACTIVITY_DRIVING) {
      dailyDriveMinutes += duration;
    }
  }

  // Výpočet kontinuální jízdy a rozdělených přestávek (15 + 30 min) od konce
  let continuousDriveMinutes = 0;
  let currentBreakMinutes = 0;
  let previousSplitBreakMinutes = 0;
  let breakCompleted = false;

  // Procházíme aktivity v obráceném pořadí od nejnovější
  for (let i = latestDay.changes.length - 1; i >= 0; i--) {
    const current = latestDay.changes[i];
    const nextTime =
      i + 1 < latestDay.changes.length ? latestDay.changes[i + 1].timeMinutes : 1440;
    const duration = Math.max(0, nextTime - current.timeMinutes);

    if (!breakCompleted) {
      if (current.activity === ACTIVITY_REST || current.activity === ACTIVITY_AVAILABILITY) {
        if (currentBreakMinutes === 0) {
          currentBreakMinutes = duration;
        } else if (previousSplitBreakMinutes === 0 && duration >= 15) {
          previousSplitBreakMinutes = duration;
        }
        if (currentBreakMinutes >= 45 || (previousSplitBreakMinutes >= 15 && currentBreakMinutes >= 30)) {
          breakCompleted = true;
        }
      } else if (current.activity === ACTIVITY_DRIVING) {
        continuousDriveMinutes += duration;
      }
    } else {
      break;
    }
  }

  // Týdenní a 14denní souhrny (posledních 7 a 14 dní)
  const nowTs = latestDay.timestamp;
  const oneWeekAgo = nowTs - 7 * 86400;
  const twoWeeksAgo = nowTs - 14 * 86400;

  let weeklyDriveMinutes = 0;
  let fortnightlyDriveMinutes = 0;

  for (const day of dailyRecords) {
    if (day.timestamp >= twoWeeksAgo) {
      let dayDriving = 0;
      for (let i = 0; i < day.changes.length; i++) {
        const c = day.changes[i];
        const next = i + 1 < day.changes.length ? day.changes[i + 1].timeMinutes : 1440;
        if (c.activity === ACTIVITY_DRIVING) {
          dayDriving += next - c.timeMinutes;
        }
      }
      fortnightlyDriveMinutes += dayDriving;
      if (day.timestamp >= oneWeekAgo) {
        weeklyDriveMinutes += dayDriving;
      }
    }
  }

  return {
    continuousDriveSeconds: continuousDriveMinutes * 60,
    dailyDriveSeconds: dailyDriveMinutes * 60,
    weeklyDriveSeconds: weeklyDriveMinutes * 60,
    fortnightlyDriveSeconds: fortnightlyDriveMinutes * 60,
    currentBreakSeconds: currentBreakMinutes * 60,
    previousSplitBreakSeconds: previousSplitBreakMinutes * 60,
    useDailyExtension: dailyDriveMinutes * 60 > 9 * 3600,
  };
}
