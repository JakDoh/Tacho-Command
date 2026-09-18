"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TrialLauncher from "./trial-launcher";
import { trackProductAnalytics } from "../lib/product-analytics-client.js";

type Locale = "sr" | "en" | "de";

const LANDING_RELEASE = "2026.09.16-oled-field-proof";

const copy = {
  sr: {
    nav: ["Zašto", "Kako radi", "Povezivanje", "Poverenje", "FAQ"],
    badge: "FIELD PROVEN • VDO DTCO 4.1a • GEN2 V2",
    heroA: "Tahograf beleži sve.",
    heroB: "TachoCommand ti kaže šta to znači.",
    heroText: "OLED cockpit za profesionalne vozače. Očitaj karticu preko telefona, vidi poslednjih 56 dana, upozorenja, pauze i korisne informacije bez kopanja po menijima tahografa.",
    start: "Pokreni 3-dnevni demo",
    starting: "Pokrećem…",
    trialError: "Demo trenutno nije dostupan. Pokušaj ponovo za nekoliko minuta.",
    open: "Otvori aplikaciju",
    guide: "Vodič za povezivanje",
    proofTitle: "Ne obećanje. Dokaz sa pravog autobusa.",
    proofText: "TachoCommand je na stvarnom VDO DTCO 4.1a završio kompletan Driver Card Slot 1 download preko Smart Tacho 2 Bluetooth puta i parsirao Gen2 v2 istoriju kartice.",
    proof: [["269", "submessage paketa"], ["67.295 B", "kompletan card payload"], ["217", "dnevnih zapisa"], ["56 / 56", "dana u pregledu"]],
    whyKicker: "ZAŠTO TACHOCOMMAND",
    whyTitle: "Vozaču ne treba još jedan meni. Treba mu odgovor.",
    whyText: "Tahograf je merodavan uređaj, ali svakodnevne odluke moraju biti brze: koliko sam vozio, kada moram na pauzu, šta se desilo juče i da li postoji upozorenje. TachoCommand prevodi sirove kartične zapise u miran, čitljiv cockpit.",
    valueCards: [
      ["01", "Odmah vidi bitno", "Aktivnost, vožnja, pauza i upozorenja u jednom prikazu bez lovljenja kroz tahograf."],
      ["02", "56 dana kao timeline", "Svaki dan dobija jasnu 24h traku sa DRIVE, WORK, AVAILABILITY i REST segmentima."],
      ["03", "Upozorenje pre problema", "Safety engine upozorava pre relevantnog praga. Pravila se biraju po pravnom režimu, ne globalno napamet."],
      ["04", "Dokaz pre marketinga", "Kompatibilnost i funkcije označavamo potvrđenim tek nakon rada na stvarnom uređaju."],
    ],
    productKicker: "PRODUCT VIEWS • FIELD DATA",
    productTitle: "Tri pogleda. Jedna mirnija smena.",
    productText: "Ovo su UI prikazi napravljeni iz stvarno potvrđenog toka i stvarnih field rezultata. Finalni landing će dobiti i prave screenshotove produkcijskog UI-ja.",
    productNames: ["Cockpit", "56-day timeline", "Warnings & compliance"],
    productDescriptions: [
      "Trenutna aktivnost i countdown do sledeće akcije bez vizuelne buke.",
      "Poslednjih 56 dana sa dnevnim trakama i jasnim zbirima.",
      "Warning, limit i candidate infringement ostaju vizuelno i semantički odvojeni.",
    ],
    beginnerKicker: "PRVI PUT POVEZUJEŠ TELEFON?",
    beginnerTitle: "Od nule do očitane kartice, bez nagađanja.",
    beginnerText: "Vodič je pisan za vozača koji nikada nije koristio Web Bluetooth niti DTCO Bluetooth meni. Svaki korak govori i šta treba da vidiš ako je sve u redu.",
    steps: [
      ["01", "Parkiraj i ubaci karticu", "Vozilo miruje. Driver kartica je u slotu 1. Telefon koristi samo dok je vozilo zaustavljeno."],
      ["02", "Na DTCO uključi pairing", "Driver 1 → Bluetooth → Pairing. Tahograf prelazi u režim povezivanja."],
      ["03", "Na telefonu izaberi DTCO", "U Android/Chrome Bluetooth dijalogu izaberi DTCO uređaj i dozvoli traženu Bluetooth vezu."],
      ["04", "Uporedi 6-cifreni PIN", "Isti PIN mora biti prikazan na telefonu i tahografu. Potvrdi na oba uređaja."],
      ["05", "Pokreni TachoCommand", "Aplikacija proverava kompatibilnost i prikazuje status veze pre bilo kakvog očitavanja."],
      ["06", "Očitaj i analiziraj", "Card download teče uz progress. Posle uspeha parser gradi 56-day pregled i upozorenja."],
    ],
    troubleTitle: "Ako nešto zapne, ne pogađamo.",
    trouble: [
      ["Ne vidiš DTCO?", "Proveri da je tahograf u Pairing meniju i da telefon ima Bluetooth dozvolu."],
      ["PIN se ne pojavljuje?", "Prekini stari pairing, ponovo uđi u Pairing i tek onda pokreni povezivanje na telefonu."],
      ["Aplikacija ne vidi Bluetooth?", "Koristi podržan Android + Chrome preko HTTPS veze. iPhone/Safari trenutno nisu potvrđani za ovu putanju."],
      ["Kartica se ne očitava?", "TachoCommand prikazuje tačan STOP/FAIL korak umesto da naslepo ponavlja zahtev."],
    ],
    cockpitKicker: "SAFETY & COMPLIANCE",
    cockpitTitle: "Upozorenje mora pomoći pre nego što postane problem.",
    cockpitText: "Safety warning i pravni verdict nisu ista stvar. TachoCommand ih razdvaja i koristi pravni profil koji odgovara vrsti saobraćaja.",
    cockpitItems: [
      ["AMBER", "Preventivno upozorenje", "Na EU 561 profilu 4h15 znači 15 minuta do 4h30 praga. Na AT linijskom ≤50 km profil koristi drugačiji prag."],
      ["LIMIT", "Granica dostignuta", "Vozač vidi da je došao do relevantnog praga, bez dramatičnog označavanja prekršaja."],
      ["REVIEW", "Mogući prekršaj", "Istorijski događaj dobija datum, vreme, trajanje i rule basis tek kada je pravni režim poznat."],
    ],
    privacyKicker: "PRIVATNOST I POVERENJE",
    privacyTitle: "Tvoja kartica nije marketinški podatak.",
    privacyText: "Raw driver-card sadržaj se ne stavlja u javni repo. Field logovi su sanitizovani. UI ne mora da prikazuje ime, broj kartice ili registraciju da bi vozaču dao koristan 56-day pregled.",
    trust: [
      ["Field-first", "Funkciju zovemo potvrđenom tek kada radi na stvarnom tahografu."],
      ["No blind retries", "Kod STOP/FAIL stanja aplikacija ne bombarduje DTCO ponovljenim zahtevima."],
      ["Rule profiles", "EU i nacionalna pravila se modeluju odvojeno i verzioniraju."],
      ["Local clarity", "Sirovi podaci se prvo pretvaraju u proverenu normalizovanu strukturu, pa tek onda crtaju u UI-ju."],
    ],
    compatibilityKicker: "KOMPATIBILNOST",
    compatibilityTitle: "Kažemo samo ono što smo stvarno dokazali.",
    tested: "FIELD TESTED",
    planned: "PLANNED / NOT YET CLAIMED",
    testedItems: ["Continental VDO DTCO 4.1a", "Smart Tacho 2 BLE Download path", "Android + Chrome + HTTPS", "Gen2 v2 Driver Card Slot 1 download", "56-day activity parsing"],
    plannedItems: ["iPhone / Safari Web Bluetooth path", "Drugi Smart Tacho 2 modeli bez field testa", "Potpuna kriptografska signature validacija u UI-ju", "Dodatni nacionalni rule-pack profili"],
    priceKicker: "FOUNDERS BETA",
    priceTitle: "Prvo dokaz. Onda naplata.",
    priceText: "Demo ostaje prvi korak. Kupovina se otvara tek kada završimo field, rule-pack i onboarding prolaze koje želimo za javnu verziju.",
    priceBullets: ["3 dana beta pristupa bez kartice", "SR • EN • DE", "Jedan vozač / lična licenca", "Kompatibilna vozila bez vezivanja za jedan autobus"],
    locked: "Kupovina se otvara nakon bete",
    once: "JEDNOM",
    faqTitle: "Pitanja koja početnik stvarno postavlja.",
    faqs: [
      ["Da li TachoCommand menja ili programira tahograf?", "Ne. Trenutni dokazani card-download tok čita podatke kroz podržanu Smart Tacho 2 komunikaciju. Tahograf i kartica ostaju merodavni izvori."],
      ["Moram li da budem tehničar da bih ga povezao?", "Ne. Landing i onboarding vode te korak po korak kroz pairing, PIN potvrdu, izbor uređaja i očitavanje."],
      ["Da li odmah pokazujete prekršaje?", "Prikazujemo upozorenja i candidate događaje samo u okviru poznatog pravnog profila. Ne proglašavamo prekršaj kada režim nije pouzdano poznat."],
      ["Radi li na svakoj autobuskoj liniji isto?", "Ne. Primer: redovna putnička linija do 50 km u Austriji ima poseban nacionalni/KV profil i ne sme se tretirati kao standardni EU 561 profil."],
      ["Da li aplikacija šalje moje raw podatke na GitHub?", "Ne. Lični .ddd field fixture ne commitujemo u repo; testovi koriste sintetičke podatke."],
    ],
    footer: "TachoCommand je pomoćni alat za profesionalne vozače. Tahograf, kartica i važeći propisi ostaju merodavni.",
    language: "Jezik",
    legal: { privacy: "Privatnost", terms: "Uslovi", impressum: "Impressum" },
  },
  en: {
    nav: ["Why", "How it works", "Connect", "Trust", "FAQ"],
    badge: "FIELD PROVEN • VDO DTCO 4.1a • GEN2 V2",
    heroA: "The tachograph records everything.",
    heroB: "TachoCommand tells you what it means.",
    heroText: "An OLED cockpit for professional drivers. Read your driver card from your phone, see the last 56 days, warnings, breaks and useful shift information without digging through tachograph menus.",
    start: "Start 3-day demo", starting: "Starting…", trialError: "The demo is temporarily unavailable. Please try again in a few minutes.", open: "Open app", guide: "Connection guide",
    proofTitle: "Not a promise. Proof from a real vehicle.",
    proofText: "On a real VDO DTCO 4.1a, TachoCommand completed a Driver Card Slot 1 download through the Smart Tacho 2 Bluetooth path and parsed Gen2 v2 card history.",
    proof: [["269", "transfer submessages"], ["67,295 B", "complete card payload"], ["217", "daily records"], ["56 / 56", "days in the view"]],
    whyKicker: "WHY TACHOCOMMAND", whyTitle: "Drivers do not need another menu. They need an answer.", whyText: "The tachograph remains authoritative, but daily decisions must be fast: how long have I driven, when is my next break, what happened yesterday, and is there a warning? TachoCommand turns raw card records into a calm, readable cockpit.",
    valueCards: [["01","See what matters now","Activity, driving, break and warnings in one view."],["02","56 days as a timeline","Every day becomes a clear 24-hour strip of DRIVE, WORK, AVAILABILITY and REST."],["03","Warn before the problem","Safety alerts fire before the relevant limit and rules depend on the selected legal profile."],["04","Proof before marketing","Compatibility is claimed only after real-device validation."]],
    productKicker: "PRODUCT VIEWS • FIELD DATA", productTitle: "Three views. One calmer shift.", productText: "These views are built from the proven flow and real field results. Final production screenshots will replace them without changing the product story.", productNames: ["Cockpit","56-day timeline","Warnings & compliance"], productDescriptions: ["Current activity and countdown to the next action.","The last 56 days with daily activity strips and totals.","Warnings, limits and candidate infringements remain clearly separated."],
    beginnerKicker: "FIRST TIME CONNECTING?", beginnerTitle: "From zero to a read card without guesswork.", beginnerText: "The guide is written for a driver who has never used Web Bluetooth or the DTCO Bluetooth menu. Every step tells you what success should look like.",
    steps: [["01","Park and insert the card","Vehicle stationary. Driver card in slot 1. Use the phone only while stopped."],["02","Enable pairing on DTCO","Driver 1 → Bluetooth → Pairing."],["03","Select DTCO on the phone","Choose the DTCO device in Android/Chrome Bluetooth and grant the requested connection."],["04","Compare the 6-digit PIN","The same PIN must be visible on phone and tachograph. Confirm both."],["05","Open TachoCommand","The app verifies compatibility and connection status before reading."],["06","Read and analyse","Card download shows progress; after success the parser builds the 56-day view and warnings."]],
    troubleTitle: "If something fails, we do not guess.", trouble: [["DTCO not visible?","Check that the tachograph is in Pairing and Bluetooth permission is enabled."],["No PIN?","Remove the stale pairing, re-enter Pairing and connect again from the phone."],["No Bluetooth in the app?","Use supported Android + Chrome over HTTPS. iPhone/Safari is not yet proven for this path."],["Card read fails?","TachoCommand reports the exact STOP/FAIL stage instead of blind retries."]],
    cockpitKicker: "SAFETY & COMPLIANCE", cockpitTitle: "A warning should help before it becomes a problem.", cockpitText: "A safety warning and a legal verdict are not the same thing. TachoCommand separates them and uses the rule profile that matches the operation.", cockpitItems: [["AMBER","Preventive warning","EU 561 can warn at 4h15; an Austrian ≤50 km line uses a different threshold."],["LIMIT","Threshold reached","The driver sees the relevant limit without an early infringement label."],["REVIEW","Possible infringement","Historical events get date, time, duration and rule basis only when the legal regime is known."]],
    privacyKicker: "PRIVACY & TRUST", privacyTitle: "Your driver card is not marketing data.", privacyText: "Raw driver-card content is not committed to the public repository. Field logs are sanitised. The UI does not need to expose identity data to deliver a useful 56-day view.", trust: [["Field-first","A feature is proven only after it works on a real tachograph."],["No blind retries","STOP/FAIL states do not hammer the DTCO with repeated requests."],["Rule profiles","EU and national rules are modelled separately and versioned."],["Local clarity","Raw bytes become validated normalized data before UI rendering."]],
    compatibilityKicker: "COMPATIBILITY", compatibilityTitle: "We only claim what we have actually proven.", tested: "FIELD TESTED", planned: "PLANNED / NOT YET CLAIMED", testedItems: ["Continental VDO DTCO 4.1a","Smart Tacho 2 BLE Download path","Android + Chrome + HTTPS","Gen2 v2 Driver Card Slot 1 download","56-day activity parsing"], plannedItems: ["iPhone / Safari Web Bluetooth path","Other Smart Tacho 2 models without field tests","Full cryptographic signature validation in UI","Additional national rule packs"],
    priceKicker: "FOUNDERS BETA", priceTitle: "Proof first. Payment later.", priceText: "The demo stays the first step. Checkout opens after the field, rule-pack and onboarding gates for the public release are finished.", priceBullets: ["3-day beta access without payment card","SR • EN • DE","One driver / personal licence","Compatible vehicles without locking to one vehicle"], locked: "Checkout opens after beta", once: "ONCE",
    faqTitle: "Questions beginners actually ask.", faqs: [["Does TachoCommand modify the tachograph?","No. The proven card-download path reads data through the supported Smart Tacho 2 communication path. The tachograph and card remain authoritative."],["Do I need to be technical?","No. Pairing, PIN confirmation, device selection and card reading are guided step by step."],["Do you immediately call something an infringement?","No. Alerts and candidate events are only classified inside a known legal profile."],["Does every bus route use the same rules?","No. For example, Austrian regular passenger routes ≤50 km require a dedicated national/KV profile."],["Do my raw card files go to GitHub?","No. The personal .ddd field fixture is not committed; tests use synthetic data."]],
    footer: "TachoCommand is an assistant tool for professional drivers. The tachograph, driver card and applicable law remain authoritative.", language: "Language", legal: { privacy: "Privacy", terms: "Terms", impressum: "Imprint" },
  },
  de: {
    nav: ["Warum", "So funktioniert es", "Verbinden", "Vertrauen", "FAQ"],
    badge: "IM FELD BESTÄTIGT • VDO DTCO 4.1a • GEN2 V2",
    heroA: "Der Tachograph zeichnet alles auf.",
    heroB: "TachoCommand zeigt dir, was es bedeutet.",
    heroText: "OLED-Cockpit für Berufskraftfahrer. Fahrerkarte per Smartphone auslesen, 56 Tage sehen, Warnungen, Pausen und wichtige Schichtinformationen verstehen — ohne Menüsuche im Tachographen.",
    start: "3-Tage-Demo starten", starting: "Wird gestartet…", trialError: "Die Demo ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.", open: "App öffnen", guide: "Verbindungsanleitung",
    proofTitle: "Kein Versprechen. Nachweis aus einem echten Fahrzeug.", proofText: "TachoCommand hat an einem realen VDO DTCO 4.1a einen vollständigen Fahrerkarte-Slot-1-Download über Smart Tacho 2 Bluetooth abgeschlossen und Gen2-v2-Kartenhistorie ausgewertet.", proof: [["269","Transfer-Submessages"],["67.295 B","vollständiger Card-Payload"],["217","Tagesdatensätze"],["56 / 56","Tage im Überblick"]],
    whyKicker: "WARUM TACHOCOMMAND", whyTitle: "Fahrer brauchen kein weiteres Menü. Sie brauchen eine Antwort.", whyText: "Der Tachograph bleibt maßgeblich. Aber im Alltag müssen Antworten schnell kommen: Wie lange bin ich gefahren? Wann brauche ich Pause? Was war gestern? Gibt es eine Warnung? TachoCommand übersetzt Kartendaten in ein ruhiges Cockpit.",
    valueCards: [["01","Das Wichtige sofort sehen","Tätigkeit, Lenkzeit, Pause und Warnungen in einer Ansicht."],["02","56 Tage als Timeline","Jeder Tag wird als klare 24-Stunden-Leiste mit DRIVE, WORK, AVAILABILITY und REST dargestellt."],["03","Warnen bevor es kritisch wird","Safety-Warnungen kommen vor dem relevanten Grenzwert und hängen vom Rechtsprofil ab."],["04","Nachweis vor Marketing","Kompatibilität gilt erst nach realem Gerätetest als bestätigt."]],
    productKicker: "PRODUKTANSICHTEN • FELDDATEN", productTitle: "Drei Ansichten. Eine ruhigere Schicht.", productText: "Diese Ansichten basieren auf dem bestätigten Flow und realen Feldergebnissen. Finale Produkt-Screenshots ersetzen sie später ohne die Aussage zu ändern.", productNames: ["Cockpit","56-Tage-Timeline","Warnungen & Compliance"], productDescriptions: ["Aktuelle Tätigkeit und Countdown bis zur nächsten Aktion.","Die letzten 56 Tage mit Tagesleisten und Summen.","Warnung, Grenzwert und möglicher Verstoß bleiben sauber getrennt."],
    beginnerKicker: "ZUM ERSTEN MAL VERBINDEN?", beginnerTitle: "Von null bis zur gelesenen Karte — ohne Rätselraten.", beginnerText: "Die Anleitung ist für Fahrer geschrieben, die Web Bluetooth oder das DTCO-Bluetooth-Menü noch nie benutzt haben.",
    steps: [["01","Sicher parken und Karte einstecken","Fahrzeug steht. Fahrerkarte in Slot 1. Smartphone nur im Stand benutzen."],["02","Pairing am DTCO einschalten","Driver 1 → Bluetooth → Pairing."],["03","DTCO am Smartphone auswählen","Im Android/Chrome-Bluetooth-Dialog das DTCO-Gerät auswählen."],["04","6-stellige PIN vergleichen","Auf Smartphone und Tachograph muss dieselbe PIN stehen. Auf beiden bestätigen."],["05","TachoCommand öffnen","Die App prüft Kompatibilität und Verbindungsstatus vor dem Lesen."],["06","Lesen und analysieren","Der Kartendownload zeigt Fortschritt; danach entstehen 56-Tage-Ansicht und Warnungen."]],
    troubleTitle: "Wenn etwas hängt, raten wir nicht.", trouble: [["DTCO nicht sichtbar?","Pairing-Menü am Tachographen und Bluetooth-Berechtigung prüfen."],["Keine PIN?","Alte Kopplung entfernen, Pairing neu starten und vom Smartphone erneut verbinden."],["Kein Bluetooth in der App?","Unterstütztes Android + Chrome über HTTPS verwenden. iPhone/Safari ist noch nicht bestätigt."],["Karte wird nicht gelesen?","TachoCommand zeigt die genaue STOP/FAIL-Stufe statt blind zu wiederholen."]],
    cockpitKicker: "SAFETY & COMPLIANCE", cockpitTitle: "Eine Warnung soll helfen, bevor ein Problem entsteht.", cockpitText: "Safety-Warnung und rechtliche Bewertung sind nicht dasselbe. TachoCommand trennt beides und nutzt das passende Regelprofil.", cockpitItems: [["AMBER","Präventive Warnung","EU 561 kann bei 4h15 warnen; österreichische Linie ≤50 km nutzt einen anderen Grenzwert."],["LIMIT","Grenze erreicht","Der Fahrer sieht die relevante Grenze ohne voreilige Verstoß-Markierung."],["REVIEW","Möglicher Verstoß","Historische Ereignisse erhalten Datum, Uhrzeit, Dauer und Rechtsgrundlage erst bei bekanntem Rechtsprofil."]],
    privacyKicker: "DATENSCHUTZ & VERTRAUEN", privacyTitle: "Deine Fahrerkarte ist kein Marketingdatensatz.", privacyText: "Rohe Fahrerkartendaten werden nicht ins öffentliche Repository committed. Feldlogs sind bereinigt. Für die 56-Tage-Ansicht müssen Identitätsdaten nicht offengelegt werden.", trust: [["Field-first","Funktion gilt erst nach realem Tachographentest als bestätigt."],["No blind retries","STOP/FAIL löst keine unkontrollierten Wiederholungen aus."],["Regelprofile","EU- und nationale Regeln werden getrennt modelliert und versioniert."],["Klare Datenkette","Rohdaten werden vor der UI in geprüfte normalisierte Daten umgewandelt."]],
    compatibilityKicker: "KOMPATIBILITÄT", compatibilityTitle: "Wir behaupten nur, was wir wirklich nachgewiesen haben.", tested: "IM FELD GETESTET", planned: "GEPLANT / NOCH NICHT BESTÄTIGT", testedItems: ["Continental VDO DTCO 4.1a","Smart Tacho 2 BLE Download-Pfad","Android + Chrome + HTTPS","Gen2 v2 Fahrerkarte Slot 1 Download","56-Tage-Aktivitätsparser"], plannedItems: ["iPhone / Safari Web-Bluetooth-Pfad","Andere Smart-Tacho-2-Modelle ohne Feldtest","Vollständige kryptografische Signaturprüfung in der UI","Weitere nationale Regelprofile"],
    priceKicker: "FOUNDERS BETA", priceTitle: "Erst beweisen. Dann bezahlen.", priceText: "Die Demo bleibt der erste Schritt. Checkout öffnet erst nach den Feld-, Regel- und Onboarding-Gates für die öffentliche Version.", priceBullets: ["3 Tage Beta ohne Zahlungskarte","SR • EN • DE","Ein Fahrer / persönliche Lizenz","Kompatible Fahrzeuge ohne Bindung an ein einzelnes Fahrzeug"], locked: "Checkout öffnet nach der Beta", once: "EINMALIG",
    faqTitle: "Fragen, die Einsteiger wirklich stellen.", faqs: [["Verändert TachoCommand den Tachographen?","Nein. Der bestätigte Kartendownload liest Daten über den unterstützten Smart-Tacho-2-Kommunikationsweg."],["Muss ich technisch sein?","Nein. Pairing, PIN-Bestätigung, Geräteauswahl und Auslesen werden Schritt für Schritt erklärt."],["Nennt ihr sofort etwas einen Verstoß?","Nein. Warnungen und Kandidaten werden nur innerhalb eines bekannten Rechtsprofils klassifiziert."],["Gelten für jede Buslinie dieselben Regeln?","Nein. Österreichische Linienverkehre ≤50 km benötigen z. B. ein eigenes nationales/KV-Profil."],["Gehen meine Kartendaten zu GitHub?","Nein. Die persönliche .ddd-Datei wird nicht committed; Tests nutzen synthetische Daten."]],
    footer: "TachoCommand ist ein Hilfswerkzeug für Berufskraftfahrer. Tachograph, Fahrerkarte und geltendes Recht bleiben maßgeblich.", language: "Sprache", legal: { privacy: "Datenschutz", terms: "Bedingungen", impressum: "Impressum" },
  },
} as const;

const viewBars = [
  [18, 12, 8, 28, 10, 24],
  [7, 8, 14, 20, 5, 12, 19, 15],
  [16, 9, 27, 11, 18, 19],
];

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("sr");

  useEffect(() => {
    const saved = window.localStorage.getItem("tachocommand-locale") as Locale | null;
    if (saved && ["sr", "en", "de"].includes(saved)) {
      setLocale(saved);
      return;
    }
    const language = navigator.language.toLowerCase();
    if (language.startsWith("de")) setLocale("de");
    else if (language.startsWith("en")) setLocale("en");
  }, []);

  const t = copy[locale];
  const changeLocale = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem("tachocommand-locale", next);
    void trackProductAnalytics("locale_change", { locale: next, surface: "landing" });
  };

  const todayRows = useMemo(() => [
    { label: "DRIVING", value: "03:45", tone: "green" },
    { label: "NEXT WARNING", value: "00:15", tone: "amber" },
    { label: "TODAY", value: "05:52", tone: "cyan" },
  ], []);

  return (
    <main className="tcx-shell" data-release={LANDING_RELEASE}>
      <header className="tcx-nav">
        <a className="tcx-brand" href="#top" aria-label="TachoCommand home">
          <span className="tcx-brand-mark">TC</span>
          <strong>Tacho<span>Command</span></strong>
        </a>
        <nav className="tcx-nav-links" aria-label="Main navigation">
          <a href="#why">{t.nav[0]}</a>
          <a href="#product">{t.nav[1]}</a>
          <a href="#connect">{t.nav[2]}</a>
          <a href="#trust">{t.nav[3]}</a>
          <a href="#faq">{t.nav[4]}</a>
        </nav>
        <div className="tcx-nav-actions">
          <label className="tcx-language">
            <span>{t.language}</span>
            <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
              <option value="sr">SR</option>
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>
          </label>
          <Link className="tcx-app-link" href="/app" onClick={() => void trackProductAnalytics("open_app_click", { locale, surface: "landing" })}>{t.open}</Link>
        </div>
      </header>

      <section className="tcx-hero" id="top">
        <div className="tcx-hero-grid" aria-hidden="true" />
        <div className="tcx-hero-copy">
          <span className="tcx-proof-badge"><i />{t.badge}</span>
          <h1>{t.heroA}<br /><span>{t.heroB}</span></h1>
          <p>{t.heroText}</p>
          <div className="tcx-actions">
            <TrialLauncher label={t.start} loadingLabel={t.starting} errorLabel={t.trialError} className="tcx-primary" />
            <a className="tcx-secondary" href="#connect" onClick={() => void trackProductAnalytics("connection_guide_click", { locale, surface: "landing" })}>{t.guide}<span>↓</span></a>
          </div>
          <div className="tcx-hero-trustline">
            <span>✓ Real DTCO 4.1a</span><span>✓ Complete card download</span><span>✓ Gen2 v2</span><span>✓ 56-day parser</span>
          </div>
        </div>

        <div className="tcx-device-stage" aria-label="TachoCommand cockpit product view">
          <div className="tcx-device-glow" />
          <div className="tcx-phone">
            <div className="tcx-phone-top"><span>09:16</span><span className="tcx-live"><i /> LIVE</span></div>
            <div className="tcx-phone-brand"><span className="tcx-mini-logo">TC</span><strong>TachoCommand</strong><small>AT LINE ≤50 KM</small></div>
            <div className="tcx-status-card">
              <div><small>CURRENT ACTIVITY</small><strong>DRIVING</strong></div>
              <span className="tcx-drive-icon">●</span>
            </div>
            <div className="tcx-warning-card">
              <div><small>NEXT BREAK WARNING</small><strong>00:15</strong><span>before 04:00 threshold</span></div>
              <div className="tcx-ring"><b>3:45</b><small>drive</small></div>
            </div>
            <div className="tcx-mini-grid">
              {todayRows.map((row) => <div className={`tcx-mini tcx-${row.tone}`} key={row.label}><small>{row.label}</small><strong>{row.value}</strong></div>)}
            </div>
            <div className="tcx-phone-footer"><span>BLE CONNECTED</span><span>DRIVER CARD • SLOT 1</span></div>
          </div>
          <div className="tcx-floating tcx-floating-a"><i /> FIELD PROVEN</div>
          <div className="tcx-floating tcx-floating-b">56 DAYS READY</div>
        </div>
      </section>

      <section className="tcx-proof" aria-labelledby="proof-title">
        <div className="tcx-section-copy tcx-section-copy-wide">
          <span className="tcx-kicker">2026-09-16 FIELD RESULT</span>
          <h2 id="proof-title">{t.proofTitle}</h2>
          <p>{t.proofText}</p>
        </div>
        <div className="tcx-proof-grid">{t.proof.map(([value, label]) => <article key={value}><strong>{value}</strong><span>{label}</span></article>)}</div>
      </section>

      <section className="tcx-section" id="why">
        <div className="tcx-section-copy">
          <span className="tcx-kicker">{t.whyKicker}</span>
          <h2>{t.whyTitle}</h2>
          <p>{t.whyText}</p>
        </div>
        <div className="tcx-value-grid">
          {t.valueCards.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="tcx-section tcx-product" id="product">
        <div className="tcx-section-copy tcx-section-copy-wide">
          <span className="tcx-kicker">{t.productKicker}</span>
          <h2>{t.productTitle}</h2>
          <p>{t.productText}</p>
        </div>
        <div className="tcx-product-grid">
          {t.productNames.map((name, index) => (
            <article className="tcx-product-card" key={name}>
              <div className="tcx-product-screen">
                <div className="tcx-screen-head"><span>TC</span><small>{index === 0 ? "COCKPIT" : index === 1 ? "CARD INTELLIGENCE" : "SAFETY ENGINE"}</small></div>
                {index === 0 && <><div className="tcx-screen-big"><small>CONTINUOUS DRIVING</small><strong>03:45</strong><span>15 min to warning</span></div><div className="tcx-screen-meter"><i style={{ width: "84%" }} /></div></>}
                {index === 1 && <div className="tcx-timeline-mini">{viewBars[1].map((width, i) => <div key={i}><span style={{ width: `${width}%` }} /><b style={{ width: `${100-width}%` }} /></div>)}</div>}
                {index === 2 && <div className="tcx-alert-stack"><div className="amber"><b>AMBER</b><span>Break warning in 15 min</span></div><div><b>LIMIT</b><span>Rule threshold reached</span></div><div className="review"><b>REVIEW</b><span>Candidate event with rule basis</span></div></div>}
              </div>
              <div className="tcx-product-copy"><span>0{index + 1}</span><div><h3>{name}</h3><p>{t.productDescriptions[index]}</p></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="tcx-connect" id="connect">
        <div className="tcx-connect-intro">
          <span className="tcx-kicker">{t.beginnerKicker}</span>
          <h2>{t.beginnerTitle}</h2>
          <p>{t.beginnerText}</p>
        </div>
        <div className="tcx-connect-layout">
          <div className="tcx-step-list">
            {t.steps.map(([number, title, body]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}
          </div>
          <aside className="tcx-pair-card">
            <span className="tcx-kicker">DTCO PAIRING FLOW</span>
            <div className="tcx-pair-device"><small>VDO DTCO 4.1a</small><strong>Bluetooth Pairing</strong><code>483 271</code><span>Confirm on tachograph</span></div>
            <div className="tcx-pair-arrow">↓</div>
            <div className="tcx-pair-phone"><small>ANDROID</small><strong>DTCO-W-XXXXXX</strong><code>483 271</code><span>Pair</span></div>
            <p>PIN example only. The real 6-digit code is generated during pairing.</p>
          </aside>
        </div>
        <div className="tcx-trouble">
          <div><span className="tcx-kicker">TROUBLESHOOTING</span><h3>{t.troubleTitle}</h3></div>
          <div className="tcx-trouble-grid">{t.trouble.map(([q, a]) => <article key={q}><strong>{q}</strong><p>{a}</p></article>)}</div>
        </div>
      </section>

      <section className="tcx-section tcx-cockpit">
        <div className="tcx-section-copy">
          <span className="tcx-kicker">{t.cockpitKicker}</span>
          <h2>{t.cockpitTitle}</h2>
          <p>{t.cockpitText}</p>
        </div>
        <div className="tcx-cockpit-grid">{t.cockpitItems.map(([code, title, body]) => <article className={`tcx-level tcx-level-${code.toLowerCase()}`} key={code}><span>{code}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="tcx-trust" id="trust">
        <div className="tcx-trust-copy">
          <span className="tcx-kicker">{t.privacyKicker}</span>
          <h2>{t.privacyTitle}</h2>
          <p>{t.privacyText}</p>
        </div>
        <div className="tcx-trust-grid">{t.trust.map(([title, body]) => <article key={title}><i>✓</i><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </section>

      <section className="tcx-section tcx-compat">
        <div className="tcx-section-copy tcx-section-copy-wide"><span className="tcx-kicker">{t.compatibilityKicker}</span><h2>{t.compatibilityTitle}</h2></div>
        <div className="tcx-compat-grid">
          <article className="tcx-compat-card tcx-tested"><span>{t.tested}</span><ul>{t.testedItems.map((item) => <li key={item}>✓ {item}</li>)}</ul></article>
          <article className="tcx-compat-card"><span>{t.planned}</span><ul>{t.plannedItems.map((item) => <li key={item}>○ {item}</li>)}</ul></article>
        </div>
      </section>

      <section className="tcx-price">
        <div className="tcx-price-card">
          <span className="tcx-kicker">{t.priceKicker}</span>
          <h2>{t.priceTitle}</h2>
          <p>{t.priceText}</p>
          <ul>{t.priceBullets.map((item) => <li key={item}>✓ {item}</li>)}</ul>
          <div className="tcx-price-row"><div><strong>9,99</strong><span>€</span><small>{t.once}</small></div><button type="button" disabled>{t.locked}</button></div>
        </div>
        <div className="tcx-demo-card"><span>03</span><h3>{t.start}</h3><p>{t.heroText}</p><TrialLauncher label={t.start} loadingLabel={t.starting} errorLabel={t.trialError} className="tcx-secondary tcx-demo-button" /></div>
      </section>

      <section className="tcx-faq" id="faq">
        <div className="tcx-section-copy"><span className="tcx-kicker">FAQ</span><h2>{t.faqTitle}</h2></div>
        <div className="tcx-faq-list">{t.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <footer className="tcx-footer">
        <div className="tcx-brand"><span className="tcx-brand-mark">TC</span><strong>Tacho<span>Command</span></strong></div>
        <p>{t.footer}</p>
        <div><Link href="/privacy">{t.legal.privacy}</Link><Link href="/terms">{t.legal.terms}</Link><Link href="/impressum">{t.legal.impressum}</Link></div>
      </footer>
    </main>
  );
}
