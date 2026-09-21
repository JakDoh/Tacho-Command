const ACTIVITY_NAMES = Object.freeze(["rest", "availability", "work", "driving"]);

function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("Expected byte-like card payload");
}

function u16(bytes, offset = 0) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32(bytes, offset = 0) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  ) >>> 0;
}

function hexTag(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function decodeCardText(input) {
  const bytes = toBytes(input);
  if (!bytes.length) return null;
  const codePage = bytes[0];
  const content = bytes.slice(1).filter((value) => value !== 0x00 && value !== 0xff);
  let decoded;
  try {
    decoded = new TextDecoder(codePage >= 1 && codePage <= 16 ? `iso-8859-${codePage}` : "windows-1252")
      .decode(Uint8Array.from(content));
  } catch {
    decoded = new TextDecoder("windows-1252").decode(Uint8Array.from(content));
  }
  const normalized = decoded.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function decodeCardNumber(input) {
  const decoded = new TextDecoder("windows-1252")
    .decode(toBytes(input))
    .replace(/[\u0000-\u001f\u007f-\u00ff]/g, "")
    .trim();
  const digits = decoded.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function parseDriverIdentity(value) {
  const bytes = toBytes(value);
  // CardIdentification (65 B) + holder surname/name (2 x 36 B).
  if (bytes.length < 137) return null;
  const surname = decodeCardText(bytes.slice(65, 101));
  const firstNames = decodeCardText(bytes.slice(101, 137));
  const driverName = [firstNames, surname].filter(Boolean).join(" ") || null;
  const cardLast4 = decodeCardNumber(bytes.slice(1, 17));
  return Object.freeze({ driverName, cardLast4 });
}

function parseTopLevelTlv(input) {
  const bytes = toBytes(input);
  const objects = [];
  let offset = 0;

  while (offset < bytes.length) {
    if (bytes.length - offset < 5) throw new Error("Truncated DDD TLV header");
    const tag = hexTag(bytes.subarray(offset, offset + 3));
    const length = u16(bytes, offset + 3);
    if (length === 0xffff) throw new Error("Reserved DDD TLV length");
    const valueStart = offset + 5;
    const valueEnd = valueStart + length;
    if (valueEnd > bytes.length) throw new Error("Truncated DDD TLV value");
    objects.push(Object.freeze({ tag, value: bytes.slice(valueStart, valueEnd) }));
    offset = valueEnd;
  }

  return Object.freeze(objects);
}

function parseActivityChange(word) {
  const slotBit = (word >>> 15) & 1;
  const statusBit = (word >>> 14) & 1;
  const cardStatusBit = (word >>> 13) & 1;
  const activityCode = (word >>> 11) & 0x03;
  const timeMinutes = word & 0x07ff;
  if (timeMinutes > 1439) throw new Error("Activity minute outside 0..1439");

  const inserted = cardStatusBit === 0;
  const followingKnown = inserted ? null : statusBit === 1;
  const activityRelevant = inserted || followingKnown;

  return Object.freeze({
    slot: slotBit === 0 ? "driver" : "co-driver",
    cardStatus: inserted ? "inserted" : "not-inserted",
    activity: activityRelevant ? ACTIVITY_NAMES[activityCode] : null,
    timeMinutes,
  });
}

function readCircular(buffer, offset, length) {
  if (!Number.isInteger(offset) || offset < 0 || offset >= buffer.length) {
    throw new Error("Circular pointer outside buffer");
  }
  if (!Number.isInteger(length) || length < 0 || length > buffer.length) {
    throw new Error("Circular length invalid");
  }
  if (offset + length <= buffer.length) return buffer.slice(offset, offset + length);

  const first = buffer.slice(offset);
  const second = buffer.slice(0, length - first.length);
  const result = new Uint8Array(length);
  result.set(first, 0);
  result.set(second, first.length);
  return result;
}

function parseDailyRecord(input) {
  const bytes = toBytes(input);
  if (bytes.length < 14) throw new Error("Daily activity record too short");
  const previousRecordLength = u16(bytes, 0);
  const recordLength = u16(bytes, 2);
  if (recordLength !== bytes.length || (recordLength - 12) % 2 !== 0) {
    throw new Error("Daily activity record length mismatch");
  }

  const recordDate = new Date(u32(bytes, 4) * 1000);
  if (!Number.isFinite(recordDate.getTime())) throw new Error("Invalid activity date");
  const changes = [];
  let previousMinute = -1;

  for (let offset = 12; offset < recordLength; offset += 2) {
    const change = parseActivityChange(u16(bytes, offset));
    if (change.timeMinutes <= previousMinute) {
      throw new Error("Duplicate or non-monotonic activity minute");
    }
    previousMinute = change.timeMinutes;
    changes.push(change);
  }

  if (!changes.length || changes[0].timeMinutes !== 0) {
    throw new Error("Daily activity record must begin at 00:00");
  }

  return Object.freeze({
    previousRecordLength,
    recordLength,
    recordDate: recordDate.toISOString().slice(0, 10),
    changes: Object.freeze(changes),
  });
}

function parseDriverActivityBlock(value) {
  const bytes = toBytes(value);
  if (bytes.length < 18) throw new Error("Driver activity block too short");

  const oldest = u16(bytes, 0);
  const newest = u16(bytes, 2);
  const buffer = bytes.slice(4);
  if (oldest >= buffer.length || newest >= buffer.length) throw new Error("Activity pointer outside buffer");

  const records = [];
  const seen = new Set();
  let pointer = oldest;
  let previousLength = null;

  while (true) {
    if (seen.has(pointer)) throw new Error("Circular activity traversal loop");
    seen.add(pointer);

    const header = readCircular(buffer, pointer, 12);
    const recordLength = u16(header, 2);
    if (recordLength < 14 || recordLength > buffer.length || (recordLength - 12) % 2 !== 0) {
      throw new Error("Invalid daily activity record length");
    }

    const record = parseDailyRecord(readCircular(buffer, pointer, recordLength));
    if (records.length === 0) {
      if (record.previousRecordLength !== 0) throw new Error("Oldest record previous length must be zero");
    } else if (record.previousRecordLength !== previousLength) {
      throw new Error("Broken previous-record-length chain");
    }

    records.push(record);
    previousLength = record.recordLength;
    if (pointer === newest) break;
    pointer = (pointer + record.recordLength) % buffer.length;
  }

  return Object.freeze(records);
}

function buildStrictSegments(record) {
  const segments = [];
  for (let index = 0; index < record.changes.length; index += 1) {
    const current = record.changes[index];
    const nextMinute = index + 1 < record.changes.length
      ? record.changes[index + 1].timeMinutes
      : 1440;

    if (nextMinute <= current.timeMinutes) throw new Error("Invalid activity segment boundary");
    if (current.activity === null) continue;

    segments.push(Object.freeze({
      activity: current.activity,
      startMinute: current.timeMinutes,
      endMinute: nextMinute,
      cardStatus: current.cardStatus,
    }));
  }
  return Object.freeze(segments);
}

export function parseAppV2CardPayload(input) {
  const objects = parseTopLevelTlv(input);
  const gen2 = objects.find((object) => object.tag === "050402");
  const gen1 = objects.find((object) => object.tag === "050400");
  const activity = gen2 ?? gen1;
  if (!activity) throw new Error("Driver_Activity_Data TLV not found");

  const identityObject = objects.find((object) => object.tag === "052002")
    ?? objects.find((object) => object.tag === "052001")
    ?? objects.find((object) => object.tag === "052000");
  const identity = identityObject ? parseDriverIdentity(identityObject.value) : null;

  const records = parseDriverActivityBlock(activity.value);
  const days = records.map((record) => Object.freeze({
    date: record.recordDate,
    segments: buildStrictSegments(record),
  }));

  return Object.freeze({
    complete: true,
    generation: gen2 ? "gen2" : "gen1",
    sourceTag: activity.tag,
    driverName: identity?.driverName ?? null,
    cardLast4: identity?.cardLast4 ?? null,
    days: Object.freeze(days),
  });
}
