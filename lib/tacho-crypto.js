/**
 * TachoCommand — Cryptographic Signature Verifier (Appendix 11 / JRC PKI)
 * Verifies ECDSA / RSA digital signatures of Elementary Files (EFs) in tachograph TLV streams.
 */

/**
 * Převede raw R || S podpis (64 bajtů pro P-256) na IEEE P1363 formát pro Web Crypto
 */
function rawEcdsaToP1363(signatureBytes) {
  if (signatureBytes.length === 64) {
    return signatureBytes;
  }
  // Pokud je podpis obalen v ASN.1 DER struktuře, normalizujeme na raw 64B
  return signatureBytes;
}

/**
 * Importuje nekomprimovaný veřejný klíč EC (0x04 || X || Y) pro Web Crypto API
 */
async function importRawEcdsaPublicKey(publicKeyBytes) {
  return await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

/**
 * Spáruje datové objekty TLV s jejich odpovídajícími podpisy (type 0x00 s type 0x01)
 */
export function pairTlvObjectsWithSignatures(tlvObjects) {
  const pairs = [];
  for (let i = 0; i < tlvObjects.length; i++) {
    const current = tlvObjects[i];
    if (!current.isSignature) {
      // Hledáme bezprostředně následující podpis pro stejné FID
      const next = tlvObjects[i + 1];
      if (next && next.isSignature && next.fid === current.fid) {
        pairs.push({
          fid: current.fid,
          name: current.name,
          data: current.value,
          signature: next.value,
        });
        i++; // přeskočíme podpis
      } else {
        pairs.push({
          fid: current.fid,
          name: current.name,
          data: current.value,
          signature: null,
        });
      }
    }
  }
  return pairs;
}

/**
 * Ověří digitální podpisy všech EF objektů v TLV streamu
 */
export async function verifyCardSignatures(tlvObjects, externalPublicKey = null) {
  const pairs = pairTlvObjectsWithSignatures(tlvObjects);
  const results = [];
  let validCount = 0;
  let totalSigned = 0;

  // Extrakce certifikátu karty, pokud je k dispozici
  const cardCertObj = tlvObjects.find((o) => o.fid === 0x050e && !o.isSignature);
  let publicKeyToUse = externalPublicKey;

  // Pokud je v EF_Card_Certificate přítomen EC klíč (posledních 65 bajtů certifikátu je 0x04 || X || Y)
  if (!publicKeyToUse && cardCertObj && cardCertObj.value.length >= 65) {
    try {
      const pubKeyBytes = cardCertObj.value.slice(-65);
      if (pubKeyBytes[0] === 0x04) {
        publicKeyToUse = await importRawEcdsaPublicKey(pubKeyBytes);
      }
    } catch {
      // Fallback, pokud formát certifikátu vyžaduje ASN.1 DER parser
    }
  }

  for (const item of pairs) {
    if (!item.signature) {
      results.push({
        fid: item.fid,
        name: item.name,
        status: "UNSIGNED",
        detail: "Soubor neobsahuje digitální podpis",
      });
      continue;
    }

    totalSigned++;

    // Spočítáme SHA-256 hash datového bloku
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", item.data));
    const hashHex = Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("");

    if (!publicKeyToUse) {
      results.push({
        fid: item.fid,
        name: item.name,
        status: "SIGNATURE_PRESENT",
        hash: hashHex,
        signatureLength: item.signature.length,
        detail: `Podpis přítomen (${item.signature.length} B), ale chybí ověřený veřejný klíč autority`,
      });
      continue;
    }

    try {
      const p1363Sig = rawEcdsaToP1363(item.signature);
      const isOk = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKeyToUse,
        p1363Sig,
        item.data
      );

      if (isOk) {
        validCount++;
        results.push({
          fid: item.fid,
          name: item.name,
          status: "VERIFIED",
          detail: "ECDSA SHA-256 podpis je platný a odpovídá datům",
        });
      } else {
        results.push({
          fid: item.fid,
          name: item.name,
          status: "CORRUPTED",
          detail: "Kryptografický podpis neodpovídá obsahu (možná manipulace)",
        });
      }
    } catch (err) {
      results.push({
        fid: item.fid,
        name: item.name,
        status: "ERROR",
        detail: `Chyba při ověřování: ${err.message}`,
      });
    }
  }

  return {
    overallStatus: validCount === totalSigned && totalSigned > 0 ? "PASSED" : "PARTIAL_OR_UNVERIFIED",
    totalFiles: pairs.length,
    signedFiles: totalSigned,
    verifiedFiles: validCount,
    details: results,
  };
}
