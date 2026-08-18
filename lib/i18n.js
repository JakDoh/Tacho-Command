export const supportedLocales = Object.freeze(["sr", "en", "de"]);

export function resolveLocale(...candidates) {
  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim().toLowerCase().split("-")[0];
    if (supportedLocales.includes(normalized)) return normalized;
  }
  return "sr";
}

export const translations = Object.freeze({
  sr: Object.freeze({
    driverAssistant: "POMOĆNIK VOZAČA", sourceDemo: "DEMO", sourceManual: "RUČNO",
    truthNotConnected: "Nije povezano sa tahografom.", truthShownData: "Prikazani podaci su", truthDemo: "demonstracioni", truthManual: "ručno vođeni",
    nextSafeDecision: "SLEDEĆA BEZBEDNA ODLUKA", inProgress: "U TOKU", exceeded: "PREKORAČENO", pause: "PAUZA", untilBreak: "DO PAUZE", manualInput: "ručni unos",
    continuousReference: "Referenca: 4 h 30 min kontinuirane vožnje", why: "Zašto?", currentActivity: "TRENUTNA AKTIVNOST",
    manualHelper: "Ručni pomoćni zapis", onDevice: "NA UREĐAJU", shiftOverview: "PREGLED SMENE", timeOnePlace: "Vreme na jednom mestu", adjust: "Podesi",
    continuousDrive: "Kontinuirana vožnja", referenceLimit: "Referentna granica 04:30", dailyDrive: "Dnevna vožnja", remaining: "Preostalo",
    shiftDuration: "Trajanje smene", shiftReference: "Informativna referenca 13:00", tachoConnection: "TAHOGRAF VEZA", notConnected: "Nije povezano",
    checkDevice: "Proveri uređaj", yourTachoCommand: "Tvoj TachoCommand", fastLocalTransparent: "Brz, lokalno orijentisan i transparentan prema vozaču.",
    version: "Verzija", language: "Jezik", languageHint: "Interfejs i ključna upozorenja", languageSr: "Srpski", languageEn: "English", languageDe: "Deutsch",
    navCockpit: "Cockpit", navLog: "Dnevnik", navDevice: "Uređaj", navMore: "Više",
    activityDrive: "Vožnja", activityDriveShort: "VOŽNJA", activityWork: "Drugi rad", activityWorkShort: "RAD",
    activityAvailable: "Raspoloživost", activityRest: "Pauza / odmor", activityRestShort: "PAUZA",
    stopAndBreak: "Zaustavi vozilo i započni propisanu pauzu", pauseInProgress: "Pauza je u toku", planBreak: "Planiraj pauzu za {time}",
    modeChanged: "Ručni režim promenjen", officialSource: "Tahograf ostaje zvanični izvor",
    copyBetaReport: "Kopiraj anonimni beta izveštaj", protocolServiceDetected: "Standardni EU tacho Bluetooth servis je pronađen. Sadržaj podataka još nije verifikovan.",
    protocolServiceMissing: "BLE veza postoji, ali standardni EU tacho servis nije vidljiv. Sačuvaj beta izveštaj za analizu.",
    reportCopied: "Anonimni beta izveštaj je kopiran. Ne sadrži ime vozača niti broj kartice.", reportCopyFailed: "Izveštaj nije mogao biti kopiran. Proveri dozvolu za clipboard."
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
    version: "Version", language: "Language", languageHint: "Interface and key warnings", languageSr: "Srpski", languageEn: "English", languageDe: "Deutsch",
    navCockpit: "Cockpit", navLog: "Log", navDevice: "Device", navMore: "More",
    activityDrive: "Driving", activityDriveShort: "DRIVE", activityWork: "Other work", activityWorkShort: "WORK",
    activityAvailable: "Availability", activityRest: "Break / rest", activityRestShort: "BREAK",
    stopAndBreak: "Stop safely and begin the required break", pauseInProgress: "Break in progress", planBreak: "Plan a break in {time}",
    modeChanged: "Manual mode changed", officialSource: "The tachograph remains the official source",
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
    version: "Version", language: "Sprache", languageHint: "Oberfläche und wichtige Warnungen", languageSr: "Srpski", languageEn: "English", languageDe: "Deutsch",
    navCockpit: "Cockpit", navLog: "Protokoll", navDevice: "Gerät", navMore: "Mehr",
    activityDrive: "Lenken", activityDriveShort: "LENKEN", activityWork: "Andere Arbeit", activityWorkShort: "ARBEIT",
    activityAvailable: "Bereitschaft", activityRest: "Pause / Ruhezeit", activityRestShort: "PAUSE",
    stopAndBreak: "Sicher anhalten und die vorgeschriebene Pause beginnen", pauseInProgress: "Pause läuft", planBreak: "Pause in {time} einplanen",
    modeChanged: "Manueller Modus geändert", officialSource: "Der Tachograph bleibt die offizielle Quelle",
    copyBetaReport: "Anonymen Beta-Bericht kopieren", protocolServiceDetected: "Ein standardisierter EU-Tacho-Bluetooth-Dienst wurde gefunden. Der Dateninhalt ist noch nicht verifiziert.",
    protocolServiceMissing: "Die BLE-Verbindung besteht, aber kein standardisierter EU-Tacho-Dienst ist sichtbar. Beta-Bericht zur Analyse speichern.",
    reportCopied: "Anonymer Beta-Bericht kopiert. Er enthält weder Fahrername noch Kartennummer.", reportCopyFailed: "Der Bericht konnte nicht kopiert werden. Zwischenablage-Berechtigung prüfen."
  })
});
