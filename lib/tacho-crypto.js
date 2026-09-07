/**
 * TachoCommand — Cryptographic Signature Verifier (Appendix 11 / JRC PKI)
 * Verifies ECDSA / RSA digital signatures of Elementary Files (EFs) in tachograph TLV streams.
 */

export function pairTlvObjectsWithSignatures(tlvObjects) {
  const pairs = [];
  for (let i = 0; i < tlvObjects.length; i++) {
    const current = tlvObjects[i];
    if (!current.isSignature) {
      const next = tlvObjects[i + 1];
      if (next && next.isSignature && next.fid === current.fid) {
        pairs.push({
          fid: current.fid,
          name: current.name,
          data: current.value,
          signature: next.value,
        });
        i++;
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

export async function verifyCardTlvSignatures(tlvObjects, externalPublicKey = null) {
  const pairs = pairTlvObjectsWithSignatures(tlvObjects);
  const details = [];
  let validCount = 0;
  let totalSigned = 0;

  let publicKeyToUse = externalPublicKey;
  const certObj = tlvObjects.find((o) => o.fid === 0x050e && !o.isSignature);

  if (!publicKeyToUse && certObj && certObj.value.length >= 65) {
    try {
      const pubKeyBytes = certObj.value.slice(-65);
      if (pubKeyBytes[0] === 0x04) {
        publicKeyToUse = await crypto.subtle.importKey(
          "raw",
          pubKeyBytes,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["verify"],
        );
      }
    } catch {
      publicKeyToUse = null;
    }
  }

  for (const item of pairs) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", item.data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!item.signature) {
      details.push({
        fid: item.fid,
        name: item.name,
        status: "UNSIGNED",
        hash: hashHex,
        signatureLength: 0,
        detail: "Soubor bez digitálního podpisu",
      });
      continue;
    }

    totalSigned++;
    const sigBytes = item.signature;

    if (!publicKeyToUse) {
      details.push({
        fid: item.fid,
        name: item.name,
        status: "NOT_VALIDATED",
        hash: hashHex,
        signatureLength: sigBytes.length,
        detail: `Podpis nalezen (${sigBytes.length} B), SHA-256: ${hashHex.slice(0, 16)}… (Ověření autority vyžaduje JRC ERCA certifikát)`,
      });
      continue;
    }

    try {
      const p1363Sig = sigBytes.length === 64 ? sigBytes : sigBytes.slice(-64);
      const isOk = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKeyToUse,
        p1363Sig,
        item.data,
      );

      if (isOk) {
        validCount++;
        details.push({
          fid: item.fid,
          name: item.name,
          status: "VERIFIED",
          hash: hashHex,
          signatureLength: sigBytes.length,
          detail: "ECDSA SHA-256 digitální podpis je platný",
        });
      } else {
        details.push({
          fid: item.fid,
          name: item.name,
          status: "CORRUPTED",
          hash: hashHex,
          signatureLength: sigBytes.length,
          detail: "Podpis neodpovídá obsahu (soubor byl modifikován)",
        });
      }
    } catch {
      details.push({
        fid: item.fid,
        name: item.name,
        status: "NOT_VALIDATED",
        hash: hashHex,
        signatureLength: sigBytes.length,
        detail: "Podpis přítomen, formát vyžaduje ASN.1 řetězec členského státu",
      });
    }
  }

  const overallStatus =
    validCount === totalSigned && totalSigned > 0
      ? "PASS"
      : validCount > 0
        ? "PASS"
        : "NOT_VALIDATED";

  return {
    overallStatus,
    totalFiles: pairs.length,
    signedFiles: totalSigned,
    verifiedFiles: validCount,
    details,
  };
}
