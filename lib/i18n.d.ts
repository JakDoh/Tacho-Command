export type Locale = "cs" | "en" | "de";
export type Translation = Readonly<Record<
  "driverAssistant" | "sourceDemo" | "sourceManual" | "truthNotConnected" | "truthShownData" | "truthDemo" | "truthManual" |
  "nextSafeDecision" | "inProgress" | "exceeded" | "pause" | "untilBreak" | "manualInput" | "continuousReference" | "why" |
  "currentActivity" | "manualHelper" | "onDevice" | "shiftOverview" | "timeOnePlace" | "adjust" | "continuousDrive" |
  "referenceLimit" | "dailyDrive" | "remaining" | "shiftDuration" | "shiftReference" | "tachoConnection" | "notConnected" |
  "checkDevice" | "yourTachoCommand" | "fastLocalTransparent" | "version" | "language" | "languageHint" | "languageCs" |
  "languageEn" | "languageDe" | "navCockpit" | "navLog" | "navDevice" | "navMore" | "activityDrive" | "activityDriveShort" |
  "activityWork" | "activityWorkShort" | "activityAvailable" | "activityAvailableShort" | "activityRest" | "activityRestShort" |
  "stopAndBreak" | "pauseInProgress" | "planBreak" | "modeChanged" | "continuousReset" | "officialSource" | "copyBetaReport" |
  "protocolServiceDetected" | "protocolServiceMissing" | "reportCopied" | "reportCopyFailed" |
  "errNoBluetooth" | "errBleDisconnected" | "bleDisconnectedSafely" | "bleDeviceCancelled" |
  "bleHandshakeFailed" | "bleConnectionFailed" | "bleTransportRejected" | "bleCreditTimeout" |
  "bleTesterPresentTimeout" | "bleUdsSuccess" | "bleUdsRejected" | "bleUdsUnexpected" |
  "bleSessionTimeout" | "bleSessionRejected" | "bleSessionUnexpected" | "bleCardReadSuccess" | "bleCardReadMissing" |
  "bleRhmiError" | "bleDiagSessionError" | "bleAppProbeError" | "bleCardReadError" |
  "msgInstallPrompt" | "msgInstalled" | "msgInstallCancelled" | "msgManualSaved" | "msgDemoNote" |
  "msgDisclaimer" | "msgCompatCenterOpened" | "msgNetworkOnline" | "msgNetworkOffline" |
  "logLocalLog" | "logTitle" | "logSubtitle" | "logTodayDrive" | "logActiveShift" |
  "logEmptyTitle" | "logEmptyDesc" | "logNow" | "logManual" | "logDemo" | "logNote" |
  "devCompatCenter" | "devTitle" | "devSubtitle" | "devProfileKicker" | "devProfileTitle" |
  "devProfileDesc" | "devVehicle" | "devBus" | "devTruck" | "devOther" | "devTacho" |
  "devModel" | "devModelPlaceholder" | "statusLinked" | "statusWaiting" | "statusUnsupported" |
  "statusFailed" | "statusReady" | "statusUnknown" | "statusDevice" | "actionDisconnect" | "actionConnecting" |
  "actionConnect" | "statAttempts" | "statDrops" | "statService" | "statTransport" | "statHandshake" |
  "statUds" | "statCard" | "statYes" | "statNo" | "statRejected" | "chkWhatConfirmed" |
  "chkBleTitle" | "chkBleDesc" | "chkConsentTitle" | "chkConsentDesc" | "chkServiceTitle" |
  "chkServicePending" | "chkTransportTitle" | "chkTransportPass" | "chkTransportFail" |
  "chkTransportPending" | "chkHandshakeTitle" | "chkHandshakePass" | "chkHandshakeRej" |
  "chkHandshakeTime" | "chkHandshakeErr" | "chkHandshakeWait" | "chkHandshakePending" |
  "chkUdsTitle" | "chkUdsPass" | "chkUdsRej" | "chkUdsTime" | "chkUdsUnexp" | "chkUdsErr" |
  "chkUdsWait" | "chkUdsPending" | "chkSessionTitle" | "chkSessionPass" | "chkSessionTime" |
  "chkSessionRej" | "chkSessionErr" | "chkSessionPending" | "chkCardTitle" | "chkCardPass" |
  "chkCardFail" | "chkCardPending" | "chkFakeTitle" | "chkFakeDesc" | "stepsKicker" |
  "step1" | "step2" | "step3" | "step4" | "setKicker" | "setAppInstalled" | "setAppInstalledDesc" |
  "setInstallApp" | "setInstallAppDesc" | "setManualTime" | "setManualTimeDesc" | "setOfflineStat" |
  "setOfflineOn" | "setOfflineOff" | "adKicker" | "adTitle" | "adDesc" | "aboutSource" |
  "aboutManual" | "aboutCloud" | "aboutCloudDesc" | "provSources" | "modManualSrc" | "modTitle" |
  "modDesc" | "modCancel" | "modSave" | "modHours" | "modMins" | "modContinuous" | "modDaily" | "modShift",
  string
>>;
export const supportedLocales: readonly Locale[];
export function resolveLocale(...candidates: Array<string | null | undefined>): Locale;
export const translations: Readonly<Record<Locale, Translation>>;
