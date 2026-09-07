export const supportedLocales = Object.freeze(["cs", "en", "de"]);

export function resolveLocale(...candidates) {
  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim().toLowerCase().split("-")[0];
    if (supportedLocales.includes(normalized)) return normalized;
  }
  return "cs";
}

export const translations = Object.freeze({
  cs: Object.freeze({
    driverAssistant: "POMOCNÍK ŘIDIČE", sourceDemo: "DEMO", sourceManual: "RUČNĚ",
    truthNotConnected: "Není připojeno k tachografu.", truthShownData: "Zobrazená data jsou", truthDemo: "demonstrační", truthManual: "ručně vedená",
    nextSafeDecision: "DALŠÍ BEZPEČNÉ ROZHODNUTÍ", inProgress: "PROBÍHÁ", exceeded: "PŘEKROČENO", pause: "PŘESTÁVKA", untilBreak: "DO PŘESTÁVKY", manualInput: "ruční zadání",
    continuousReference: "Referenční limit: 4 h 30 min nepřetržitého řízení", why: "Proč?", currentActivity: "AKTUÁLNÍ AKTIVITA",
    manualHelper: "Pomocný ruční záznam", onDevice: "V ZAŘÍZENÍ", shiftOverview: "PŘEHLED SMĚNY", timeOnePlace: "Všechny časy na jednom místě", adjust: "Upravit",
    continuousDrive: "Nepřetržitá jízda", referenceLimit: "Referenční limit 04:30", dailyDrive: "Denní doba řízení", remaining: "Zbývá",
    shiftDuration: "Doba trvání směny", shiftReference: "Informativní limit 13:00", tachoConnection: "PŘIPOJENÍ K TACHOGRAFU", notConnected: "Nepřipojeno",
    checkDevice: "Zkontrolovat zařízení", yourTachoCommand: "Váš TachoCommand", fastLocalTransparent: "Rychlý, lokální a transparentní k řidiči.",
    version: "Verze", language: "Jazyk", languageHint: "Rozhraní a klíčová upozornění", languageCs: "Čeština", languageEn: "English", languageDe: "Deutsch",
    navCockpit: "Cockpit", navLog: "Deník", navDevice: "Zařízení", navMore: "Více",
    activityDrive: "Jízda", activityDriveShort: "JÍZDA", activityWork: "Jiná práce", activityWorkShort: "PRÁCE",
    activityAvailable: "Pohotovost", activityAvailableShort: "POHOT", activityRest: "Přestávka / odpočinek", activityRestShort: "PAUZA",
    stopAndBreak: "Bezpečně zastavte vozidlo a zahajte povinnou přestávku", pauseInProgress: "Přestávka probíhá", planBreak: "Naplánujte přestávku za {time}",
    modeChanged: "Manuální režim změněn", continuousReset: "Kontinuální jízda vynulována po platné přestávce", officialSource: "Tachograf zůstává oficiálním zdrojem",
    copyBetaReport: "Kopírovat anonymní beta report", protocolServiceDetected: "Standardní Bluetooth služba tachografu byla nalezena. Obsah dat ještě není ověřen.",
    protocolServiceMissing: "BLE spojení existuje, ale standardní EU služba tachografu není viditelná. Uložte beta report k analýze.",
    reportCopied: "Anonymní beta report byl zkopírován. Neobsahuje jméno řidiče ani číslo karty.", reportCopyFailed: "Report se nepodařilo zkopírovat. Zkontrolujte oprávnění schránky."
  }),
  en: Object.freeze({
    driverAssistant: "DRIVER ASSISTANT", sourceDemo: "DEMO", sourceManual: "MANUAL",
    truthNotConnected: "Not connected to a tachograph.", truthShownData: "Displayed data is", truthDemo: "demonstration data", truthManual: "manually recorded",
    nextSafeDecision: "NEXT SAFE DECISION", inProgress: "ACTIVE", exceeded: "EXCEEDED", pause: "BREAK", untilBreak: "UNTIL BREAK", manualInput: "manual input",
    continuousReference: "Reference: 4 h 30 min continuous driving", why: "Why?", currentActivity: "CURRENT ACTIVITY",
    manualHelper: "Manual helper log", onDevice: "ON DEVICE", shiftOverview: "SHIFT OVERVIEW", timeOnePlace: "All times in one place", adjust: "Adjust",
    continuousDrive: "Continuous driving", referenceLimit: "Reference limit 04:30", dailyDrive: "Daily driving", remaining: "Remaining",
    shiftDuration: "Shift duration", shiftReference: "Informative reference 13:00", tachoConnection: "TACHOGRAPH LINK", notConnected: "Not connected",
    checkDevice: "Check device", yourTachoCommand: "Your TachoCommand", fastLocalTransparent: "Fast, local-first and transparent for the driver.",
    version: "Version", language: "Language", languageHint: "Interface and key warnings", languageCs: "Čeština", languageEn: "English", languageDe: "Deutsch",
    navCockpit: "Cockpit", navLog: "Log", navDevice: "Device", navMore: "More",
    activityDrive: "Driving", activityDriveShort: "DRIVE", activityWork: "Other work", activityWorkShort: "WORK",
    activityAvailable: "Availability", activityAvailableShort: "AVAIL", activityRest: "Break / rest", activityRestShort: "BREAK",
    stopAndBreak: "Stop safely and begin the required break", pauseInProgress: "Break in progress", planBreak: "Plan a break in {time}",
    modeChanged: "Manual mode changed", continuousReset: "Continuous driving reset after a qualifying break", officialSource: "The tachograph remains the official source",
    copyBetaReport: "Copy anonymous beta report", protocolServiceDetected: "A standard EU tacho Bluetooth service was found. Data content is not verified yet.",
    protocolServiceMissing: "The BLE link works, but no standard EU tacho service is visible. Save the beta report for analysis.",
    reportCopied: "Anonymous beta report copied. It contains no driver name or card number.", reportCopyFailed: "The report could not be copied. Check clipboard permission."
  }),
  de: Object.freeze({
    driverAssistant: "FAHRERASSISTENT", sourceDemo: "DEMO", sourceManual: "MANUELL",
    truthNotConnected: "Nicht mit dem Tachographen verbunden.", truthShownData: "Angezeigte Daten sind", truthDemo: "Demodaten", truthManual: "manuell erfasst",
    nextSafeDecision: "NÄCHSTE SICHERE ENTSCHEIDUNG", inProgress: "AKTIV", exceeded: "ÜBERSCHRITTEN", pause: "PAUSE", untilBreak: "BIS ZUR PAUSE", manualInput: "manuelle Eingabe",
    continuousReference: "Referenz: 4 h 30 min ununterbrochene Lenkzeit", why: "Warum?", currentActivity: "AKTUELLE AKTIVITÄT",
    manualHelper: "Manueller Hilfseintrag", onDevice: "AUF DEM GERÄT", shiftOverview: "SCHICHTÜBERSICHT", timeOnePlace: "Alle Zeiten auf einen Blick", adjust: "Anpassen",
    continuousDrive: "Ununterbrochene Lenkzeit", referenceLimit: "Referenzgrenze 04:30", dailyDrive: "Tägliche Lenkzeit", remaining: "Verbleibend",
    shiftDuration: "Schichtdauer", shiftReference: "Informative Referenz 13:00", tachoConnection: "TACHOGRAPH-VERBINDUNG", notConnected: "Nicht verbunden",
    checkDevice: "Gerät prüfen", yourTachoCommand: "Dein TachoCommand", fastLocalTransparent: "Schnell, lokal und transparent für den Fahrer.",
    version: "Version", language: "Sprache", languageHint: "Oberfläche und wichtige Warnungen", languageCs: "Čeština", languageEn: "English", languageDe: "Deutsch",
    navCockpit: "Cockpit", navLog: "Protokoll", navDevice: "Gerät", navMore: "Mehr",
    activityDrive: "Lenken", activityDriveShort: "LENKEN", activityWork: "Andere Arbeit", activityWorkShort: "ARBEIT",
    activityAvailable: "Bereitschaft", activityAvailableShort: "BEREIT", activityRest: "Pause / Ruhezeit", activityRestShort: "PAUSE",
    stopAndBreak: "Sicher anhalten und die vorgeschriebene Pause beginnen", pauseInProgress: "Pause läuft", planBreak: "Pause in {time} einplanen",
    modeChanged: "Manueller Modus geändert", continuousReset: "Ununterbrochene Lenkzeit nach gültiger Pause zurückgesetzt", officialSource: "Der Tachograph bleibt die offizielle Quelle",
    copyBetaReport: "Anonymen Beta-Bericht kopieren", protocolServiceDetected: "Ein standardisierter EU-Tacho-Bluetooth-Dienst wurde gefunden. Der Dateninhalt ist noch nicht verifiziert.",
    protocolServiceMissing: "Die BLE-Verbindung besteht, aber kein standardisierter EU-Tacho-Dienst ist sichtbar. Beta-Bericht zur Analyse speichern.",
    reportCopied: "Anonymer Beta-Bericht kopiert. Er enthält weder Fahrername noch Kartennummer.", reportCopyFailed: "Der Bericht konnte nicht kopiert werden. Zwischenablage-Berechtigung prüfen."
  })
});
