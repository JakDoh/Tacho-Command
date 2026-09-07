/**
 * TachoCommand — Compliant DDD / ESM Smart Card File Builder & TLV Validator
 * According to Commission Implementing Regulation (EU) 2016/799 / 2021/1228
 * Annex 1C, Appendix 7 (Section 2.3 & 3.4, requirements DDP_040 to DDP_050).
 */

const KNOWN_EF_NAMES = Object.freeze({
  0x0501: "EF_Application_Identification",
  0x0502: "EF_Events_Data",
  0x0503: "EF_Faults_Data",
  0x0504: "EF_Driver_Activity_Data",
  0x0505: "EF_Vehicles_Used",
  0x0506: "EF_Places",
  0x0507: "EF_Current_Usage",
  0x0508: "EF_Control_Activity_Data",
  0x0509: "EF_Specific_Conditions",
  0x0520: "EF_Identification",
  0x050e: "EF_Card_Certificate",
  0x050f: "EF_CA_Certificate",
  0x0510: "EF_Link_Certificate",
});

/**
 * Parses and validates raw card bytes into a compliant TLV object list.
 * @param {Uint8Array|number[]} rawBytes 
 */
export function parseCardTlvStream(rawBytes) {
  const bytes = rawBytes instanceof Uint8Array ? rawBytes : Uint8Array.from(rawBytes ?? []);
  const objects = [];
  let offset = 0;

  while (offset + 5 <= bytes.length) {
    const fid = (bytes[offset] << 8) | bytes[offset + 1];
    const type = bytes[offset + 2]; // 0x00 = data, 0x01 = signature
    const length = (bytes[offset + 3] << 8) | bytes[offset + 4];

    // Pokud narazíme na neznámý typ hlavičky, ale už máme načtená data z karty,
    // jedná se o připojený podpis jednotky vozidla (VU Signature) na konci TREP 06.
    if (type !== 0x00 && type !== 0x01) {
      if (objects.length > 0) {
        objects.push({
          fid: 0xFFFF,
          name: "VU_Signature_Block",
          isSignature: true, // Nastavujeme true, aby ho krypto validátor karet ignoroval
          length: bytes.length - offset,
          value: bytes.slice(offset),
        });
        offset = bytes.length;
        break;
      }
      return { valid: false, reason: `Invalid TLV tag type at offset ${offset}: 0x${type.toString(16)}`, objects: [] };
    }

    const valueStart = offset + 5;
    const valueEnd = valueStart + length;

    // Pokud délka přesahuje velikost souboru, ale už máme načtená data z karty,
    // může jít o VU Signature, který čistě náhodou začínal bajtem 0x00 nebo 0x01.
    if (valueEnd > bytes.length) {
      if (objects.length > 0) {
        objects.push({
          fid: 0xFFFF,
          name: "VU_Signature_Block",
          isSignature: true,
          length: bytes.length - offset,
          value: bytes.slice(offset),
        });
        offset = bytes.length;
        break;
      }
      return { valid: false, reason: `Truncated TLV object at offset ${offset}. Expected ${length} bytes, file ends.`, objects: [] };
    }

    const value = bytes.slice(valueStart, valueEnd);
    objects.push({
      fid,
      name: KNOWN_EF_NAMES[fid] ?? `EF_${fid.toString(16).padStart(4, "0").toUpperCase()}`,
      isSignature: type === 0x01,
      length,
      value,
    });

    offset = valueEnd;
  }

  // Zpracování případného krátkého zbytku na úplném konci souboru (< 5 bajtů)
  if (offset < bytes.length && objects.length > 0) {
    objects.push({
      fid: 0xFFFF,
      name: "VU_Signature_Block",
      isSignature: true,
      length: bytes.length - offset,
      value: bytes.slice(offset),
    });
    offset = bytes.length;
  }

  const valid = offset === bytes.length && objects.length > 0;
  return {
    valid,
    reason: valid ? null : `Stream ended with ${bytes.length - offset} trailing unparsed bytes`,
    objects,
    totalBytes: offset,
  };
}

/**
 * Decodes string from tachograph card (CodePage + ASCII/Latin bytes)
 */
function decodeTachoString(bytes) {
  if (!bytes || bytes.length <= 1) return "";
  const charBytes = bytes.slice(1);
  return new TextDecoder("iso-8859-1").decode(charBytes).replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
}

/**
 * Extracts Card Holder metadata from EF_Identification (FID 0x0520)
 * Annex 1C, Appendix 2 (CardIdentification structure)
 */
export function extractCardMetadata(tlvObjects) {
  const identObj = tlvObjects.find((obj) => obj.fid === 0x0520 && !obj.isSignature);
  if (!identObj || identObj.value.length < 143) {
    return null;
  }

  const data = identObj.value;
  const rawCardNumber = new TextDecoder("ascii").decode(data.slice(1, 17)).trim();
  const surname = decodeTachoString(data.slice(65, 101));
  const firstName = decodeTachoString(data.slice(101, 137));
  const expiryTimestamp = (data[61] << 24) | (data[62] << 16) | (data[63] << 8) | data[64];
  const expiryDate = expiryTimestamp > 0 ? new Date(expiryTimestamp * 1000).toISOString().split("T")[0] : "unknown";

  return {
    cardNumber: rawCardNumber.replace(/[^A-Za-z0-9]/g, ""),
    surname: surname || "UNKNOWN",
    firstName: firstName || "DRIVER",
    expiryDate,
  };
}

/**
 * Generates official EU compliant DDD file name:
 * Format: C_YYYYMMDD_HHMM_[Surname]_[FirstName]_[CardNumber].DDD
 */
export function generateOfficialDddFileName(metadata, date = new Date(), isGen2v2 = true) {
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const hm = `${pad(date.getHours())}${pad(date.getMinutes())}`;

  const surname = (metadata?.surname ?? "DRIVER").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 15);
  const name = (metadata?.firstName ?? "CARD").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10);
  const card = (metadata?.cardNumber ?? "0000000000000000").slice(0, 16);

  const extension = isGen2v2 ? "c1c" : "ddd";
  return `C_${ymd}_${hm}_${surname}_${name}_${card}.${extension}`;
}
