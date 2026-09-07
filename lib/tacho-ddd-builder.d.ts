export interface TlvObject {
  fid: number;
  name: string;
  isSignature: boolean;
  length: number;
  value: Uint8Array;
}

export interface TlvValidationResult {
  valid: boolean;
  reason: string | null;
  objects: TlvObject[];
  totalBytes?: number;
}

export interface CardMetadata {
  cardNumber: string;
  surname: string;
  firstName: string;
  expiryDate: string;
}

export function parseCardTlvStream(rawBytes: Uint8Array | readonly number[]): TlvValidationResult;
export function extractCardMetadata(tlvObjects: TlvObject[]): CardMetadata | null;
export function generateOfficialDddFileName(metadata: CardMetadata | null, date?: Date, isGen2v2?: boolean): string;
