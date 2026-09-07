export type Locale = "cs" | "en" | "de";
export type Translation = Readonly<Record
  "driverAssistant" | "sourceDemo" | "sourceManual" | "truthNotConnected" | "truthShownData" | "truthDemo" | "truthManual" |
  "nextSafeDecision" | "inProgress" | "exceeded" | "pause" | "untilBreak" | "manualInput" | "continuousReference" | "why" |
  "currentActivity" | "manualHelper" | "onDevice" | "shiftOverview" | "timeOnePlace" | "adjust" | "continuousDrive" |
  "referenceLimit" | "dailyDrive" | "remaining" | "shiftDuration" | "shiftReference" | "tachoConnection" | "notConnected" |
  "checkDevice" | "yourTachoCommand" | "fastLocalTransparent" | "version" | "language" | "languageHint" | "languageCs" |
  "languageEn" | "languageDe" | "navCockpit" | "navLog" | "navDevice" | "navMore" | "activityDrive" | "activityDriveShort" |
  "activityWork" | "activityWorkShort" | "activityAvailable" | "activityAvailableShort" | "activityRest" | "activityRestShort" |
  "stopAndBreak" | "pauseInProgress" | "planBreak" | "modeChanged" | "continuousReset" | "officialSource" | "copyBetaReport" |
  "protocolServiceDetected" | "protocolServiceMissing" | "reportCopied" | "reportCopyFailed",
  string
>>;
export const supportedLocales: readonly Locale[];
export function resolveLocale(...candidates: Array<string | null | undefined>): Locale;
export const translations: Readonly<Record<Locale, Translation>>;
