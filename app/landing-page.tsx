"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackProductAnalytics } from "../lib/product-analytics-client.js";
import InstallGuide from "./install-guide";
import { formatTachoCommandVersionLine } from "../lib/product-version.js";
export type Locale = "sr" | "en" | "de";
const copy = {
  sr: {
    title: "Tvoja kartica. Jasan pregled na telefonu.",
    body: "Očitaj podržanu karticu vozača preko Bluetooth veze i pregledaj dostupnu istoriju do 56 dana. Podaci kartice ostaju na tvom uređaju.",
    open: "Otvori beta aplikaciju",
    guide: "Prvo povezivanje",
    safety:
      "Bezbednost na prvom mestu: povezivanje i očitavanje samo dok vozilo miruje.",
    features: [
      [
        "Očitaj karticu",
        "Provereni tok za VDO DTCO 4.1a, karticu u slotu 1 i Android Chrome.",
      ],
      [
        "Pregledaj dane",
        "Vožnja, rad, raspoloživost i odmor, sa lokalnim vremenom telefona i označenim vremenom očitavanja.",
      ],
      [
        "Sačuvaj kontrolu",
        "Sačuvanu karticu biraš sam. Možeš izvesti korisnički CSV pregled i obrisati lokalne podatke.",
      ],
    ],
    how: "Tri koraka do istorije",
    steps: [
      "Parkiraj vozilo, ubaci svoju karticu u slot 1 i pripremi Android telefon sa Chrome pregledačem.",
      "Uključi ITS podatke i upari telefon sa tahografom. Uporedi PIN na oba uređaja pre potvrde.",
      "Otvori aplikaciju, poveži tahograf, zatim pokreni očitavanje kartice. Sačekaj potvrdu da su podaci obrađeni i sačuvani.",
    ],
    pair: "VDO DTCO 4.1a — prvo uparivanje",
    pairSteps: [
      "Sa normalnog ekrana: pritisni OK, strelicu dole dva puta, izaberi VOZAČ 1 i pritisni OK.",
      "Za ITS: strelicu dole dva puta, PODEŠAVANJA, OK, ITS PODACI, OK, pa potvrdi OK.",
      "Vrati se na normalni ekran. OK, strelica dole dva puta, VOZAČ 1, OK; strelica dole tri puta, BLUETOOTH, OK, PAIRING.",
      "Pritisni OK na PAIRING. Kada tahograf zatraži povezivanje, u Android Bluetooth podešavanjima izaberi DTCO.",
      "Proveri da je šestocifreni PIN isti na oba ekrana. Potvrdi na telefonu; na DTCO 4.1a izaberi Ja strelicom dole i potvrdi OK.",
      "Tek nakon uspešnog uparivanja otvori TachoCommand i izaberi uređaj u browser dijalogu.",
    ],
    pairNote:
      "Nazivi menija zavise od jezika uređaja. Ovi koraci su za potvrđeni 4.1a; druge verzije zahtevaju proveru.",
    trouble:
      "Ako uređaj nije vidljiv, proveri Bluetooth, Nearby devices dozvolu, ITS i slot kartice. Ne briši postojeće uparivanje kao prvi korak.",
    trust: "Jasno šta je potvrđeno",
    tested: "FIELD PROVEN · VDO DTCO 4.1a · Android Chrome · Slot 1",
    scope:
      "Dokazani download nije potvrda podrške za svaki model. Drugi tahografi i iPhone/Safari nisu potvrđeni za ovu putanju. Kriptografska validacija DDD potpisa i analiza prekršaja nisu dostupne funkcije ovog kandidata.",
    privacy: "Podaci i privatnost",
    privacyText:
      "Kartična istorija se obrađuje i čuva lokalno. Ograničena tehnička telemetrija služi dijagnostici; ne sadrži ime vozača, raw karticu ili lokaciju. Detalji su u politici privatnosti.",
    beta: "Beta koju proveravamo zajedno",
    betaText:
      "Beta ulaz je direktan, bez obećanja trodnevne licence ili aktivne kupovine. Vremena proveri na zvaničnom tahografu. Kandidat zahteva novu terensku proveru pre objavljivanja.",
    footer:
      "TachoCommand je pomoćni pregled. Tahograf, kartica i važeći propisi ostaju merodavni.",
    legal: ["Privatnost", "Uslovi", "Impressum"],
  },
  en: {
    title: "Your driver card. Clear on your phone.",
    body: "Read a supported driver card over Bluetooth and review up to 56 days of available history. Card data stays on your device.",
    open: "Open beta app",
    guide: "First connection",
    safety:
      "Safety first: connect and read only while the vehicle is stationary.",
    features: [
      [
        "Read your card",
        "Field-proven flow for VDO DTCO 4.1a, driver card in slot 1 and Android Chrome.",
      ],
      [
        "Review your days",
        "Driving, work, availability and rest, with phone-local time and a visible read timestamp.",
      ],
      [
        "Stay in control",
        "Choose when to show saved history. Export a user CSV overview or delete local data.",
      ],
    ],
    how: "Three steps to your history",
    steps: [
      "Park, insert your own card in slot 1 and prepare an Android phone with Chrome.",
      "Enable ITS data and pair the phone. Compare the PIN on both devices before confirming.",
      "Open the app, connect the tachograph, then read the card. Wait until processing and saving are confirmed.",
    ],
    pair: "VDO DTCO 4.1a — first pairing",
    pairSteps: [
      "From the normal display: press OK, down twice, select DRIVER 1 and press OK.",
      "For ITS: down twice, SETTINGS, OK, ITS DATA, OK, then confirm OK.",
      "Return to the normal display. OK, down twice, DRIVER 1, OK; down three times, BLUETOOTH, OK, PAIRING.",
      "Press OK on PAIRING. When the tachograph asks you to connect, select DTCO in Android Bluetooth settings.",
      "Compare the six-digit PIN on both screens. Confirm on the phone; on DTCO 4.1a select Yes with down and confirm OK.",
      "After successful pairing, open TachoCommand and choose the device in the browser dialog.",
    ],
    pairNote:
      "Menu names depend on device language. These steps cover the verified 4.1a; other versions require testing.",
    trouble:
      "If the device is missing, check Bluetooth, Nearby devices permission, ITS and the card slot. Do not delete existing pairing as the first step.",
    trust: "Clear about what is proven",
    tested: "FIELD PROVEN · VDO DTCO 4.1a · Android Chrome · Slot 1",
    scope:
      "A proven download does not establish support for every model. Other tachographs and iPhone/Safari are not confirmed for this path. DDD signature validation and infringement analysis are not available in this candidate.",
    privacy: "Data and privacy",
    privacyText:
      "Card history is processed and stored locally. Limited technical telemetry supports diagnostics; it excludes driver names, raw card data and location. See the privacy policy for details.",
    beta: "A beta we validate together",
    betaText:
      "Direct beta access, without a three-day licence promise or active checkout. Cross-check times on the official tachograph. This candidate needs new field validation before release.",
    footer:
      "TachoCommand is an auxiliary overview. The tachograph, card and applicable rules remain authoritative.",
    legal: ["Privacy", "Terms", "Imprint"],
  },
  de: {
    title: "Deine Fahrerkarte. Klar auf dem Smartphone.",
    body: "Unterstützte Fahrerkarten per Bluetooth auslesen und bis zu 56 Tage verfügbaren Verlauf ansehen. Kartendaten bleiben auf deinem Gerät.",
    open: "Beta-App öffnen",
    guide: "Erste Verbindung",
    safety:
      "Sicherheit zuerst: nur bei stehendem Fahrzeug verbinden und auslesen.",
    features: [
      [
        "Karte auslesen",
        "Im Feld bestätigter Ablauf für VDO DTCO 4.1a, Fahrerkarte in Slot 1 und Android Chrome.",
      ],
      [
        "Tage ansehen",
        "Lenken, Arbeit, Bereitschaft und Ruhe mit lokaler Telefonzeit und sichtbarem Auslesezeitpunkt.",
      ],
      [
        "Kontrolle behalten",
        "Gespeicherte Karte bewusst anzeigen, CSV-Übersicht exportieren oder lokale Daten löschen.",
      ],
    ],
    how: "Drei Schritte zum Verlauf",
    steps: [
      "Fahrzeug parken, eigene Karte in Slot 1 einstecken und Android-Smartphone mit Chrome vorbereiten.",
      "ITS-Daten aktivieren und Telefon koppeln. PIN auf beiden Geräten vor dem Bestätigen vergleichen.",
      "App öffnen, Tachograph verbinden und Karte auslesen. Auf die Bestätigung der Verarbeitung und Speicherung warten.",
    ],
    pair: "VDO DTCO 4.1a — erste Kopplung",
    pairSteps: [
      "In der Standardanzeige: OK drücken, zweimal nach unten, FAHRER 1 auswählen und OK drücken.",
      "Für ITS: zweimal nach unten, EINSTELLUNGEN, OK, ITS-DATEN, OK, dann mit OK bestätigen.",
      "Zur Standardanzeige zurück. OK, zweimal nach unten, FAHRER 1, OK; dreimal nach unten, BLUETOOTH, OK, KOPPELUNG.",
      "Bei KOPPELUNG OK drücken. Wenn Bitte verbinden erscheint, DTCO in den Android-Bluetooth-Einstellungen auswählen.",
      "Sechsstellige PIN auf beiden Anzeigen vergleichen. Am Telefon bestätigen; am DTCO 4.1a mit Pfeil nach unten Ja wählen und OK drücken.",
      "Erst nach erfolgreicher Kopplung TachoCommand öffnen und das Gerät im Browserdialog auswählen.",
    ],
    pairNote:
      "Menünamen hängen von der Gerätesprache ab. Die Schritte gelten für den bestätigten 4.1a; andere Versionen müssen getestet werden.",
    trouble:
      "Gerät fehlt? Bluetooth, Berechtigung für Geräte in der Nähe, ITS und Kartenslot prüfen. Bestehende Kopplung nicht als ersten Schritt löschen.",
    trust: "Klar benennen, was bestätigt ist",
    tested: "IM FELD BESTÄTIGT · VDO DTCO 4.1a · Android Chrome · Slot 1",
    scope:
      "Ein bestätigter Download belegt nicht die Unterstützung aller Modelle. Andere Tachographen und iPhone/Safari sind für diesen Weg nicht bestätigt. DDD-Signaturprüfung und Verstoßanalyse sind in diesem Kandidaten nicht verfügbar.",
    privacy: "Daten und Datenschutz",
    privacyText:
      "Kartenverlauf wird lokal verarbeitet und gespeichert. Begrenzte technische Telemetrie dient der Diagnose; Fahrername, rohe Kartendaten und Standort sind ausgeschlossen. Einzelheiten in der Datenschutzerklärung.",
    beta: "Eine Beta, die wir gemeinsam prüfen",
    betaText:
      "Direkter Beta-Zugang ohne Dreitageslizenz oder aktive Kaufabwicklung. Zeiten am offiziellen Tachograph prüfen. Dieser Kandidat benötigt vor Veröffentlichung neue Feldtests.",
    footer:
      "TachoCommand ist eine ergänzende Übersicht. Tachograph, Karte und geltende Vorschriften bleiben maßgeblich.",
    legal: ["Datenschutz", "Bedingungen", "Impressum"],
  },
} as const;
export default function LandingPage({
  initialLocale = "sr",
}: {
  initialLocale?: Locale;
  canonicalLocaleRoute?: boolean;
}) {
  const locale = initialLocale,
    t = copy[locale],
    router = useRouter();
  const openApp = () => {
    try { localStorage.setItem("tachocommand-locale", locale); } catch {}
    void trackProductAnalytics("open_app_click", { locale, surface: "landing" });
  };
  return (
    <main className="tcx-shell" lang={locale}>
      <header className="tcx-nav">
        <Link className="tcx-brand" href="/">
          TC · TachoCommand
        </Link>
        <select
          aria-label="Language / Jezik / Sprache"
          value={locale}
          onChange={(e) => {
            const next = e.target.value as Locale;
            void trackProductAnalytics("locale_change", {
              locale: next,
              surface: "landing",
            });
            try {
              localStorage.setItem("tachocommand-locale", next);
            } catch {}
            router.push("/" + next);
          }}
        >
          <option value="sr">Srpski</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
        <Link
          href="/app"
          onClick={openApp}
        >
          {t.open}
        </Link>
      </header>
      <section className="tcx-hero">
        <div className="tcx-hero-copy">
          <span className="tcx-badge">{t.tested}</span>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
          <div className="tcx-hero-actions">
            <Link
              className="tcx-primary"
              href="/app"
              onClick={openApp}
            >
              {t.open}
            </Link>
            <a
              className="tcx-secondary"
              href="#connect"
              onClick={() =>
                void trackProductAnalytics("connection_guide_click", {
                  locale,
                  surface: "landing",
                })
              }
            >
              {t.guide}
            </a>
          </div>
          <InstallGuide locale={locale} />
          <p>
            <strong>{t.safety}</strong>
          </p>
        </div>
      </section>
      <section className="tcx-section">
        <div className="tcx-value-grid">
          {t.features.map(([title, body]) => (
            <article className="tcx-value-card" key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="tcx-section" id="connect">
        <h2>{t.how}</h2>
        <ol>
          {t.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <details>
          <summary>{t.pair}</summary>
          <ol>
            {t.pairSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>{t.pairNote}</p>
        </details>
        <p>{t.trouble}</p>
      </section>
      <section className="tcx-section">
        <h2>{t.trust}</h2>
        <p>{t.scope}</p>
        <h2>{t.privacy}</h2>
        <p>{t.privacyText}</p>
      </section>
      <section className="tcx-section">
        <h2>{t.beta}</h2>
        <p>{t.betaText}</p>
        <Link
          href="/app"
          onClick={openApp}
          className="tcx-primary"
        >
          {t.open}
        </Link>
      </section>
      <footer className="tcx-footer">
        <p>{t.footer}</p>
        <nav>
          {["privacy", "terms", "impressum"].map((path, i) => (
            <Link key={path} href={"/" + path}>
              {t.legal[i]}
            </Link>
          ))}
        </nav>
        <small>{formatTachoCommandVersionLine()}</small>
      </footer>
    </main>
  );
}
