export interface SignatureVerificationDetail {
  fid: number;
  name: string;
  status: "VERIFIED" | "NOT_VALIDATED" | "CORRUPTED" | "UNSIGNED";
  hash: string;
  signatureLength: number;
  detail: string;
}

export interface CryptoReport {
  overallStatus: "PASS" | "NOT_VALIDATED" | "FAIL";
  totalFiles: number;
  signedFiles: number;
  verifiedFiles: number;
  details: SignatureVerificationDetail[];
}

export function pairTlvObjectsWithSignatures(tlvObjects: Array<{ fid: number; name: string; isSignature: boolean; value: Uint8Array }>): Array<{
  fid: number;
  name: string;
  data: Uint8Array;
  signature: Uint8Array | null;
}>;

export function verifyCardTlvSignatures(
  tlvObjects: Array<{ fid: number; name: string; isSignature: boolean; value: Uint8Array }>,
  externalPublicKey?: CryptoKey | null
): Promise<CryptoReport>;
