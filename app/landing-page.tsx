"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect } from "react";
import { publishProductLocale, readProductLocale, localizedLandingHref } from "../lib/product-locale.js";
import { useRouter } from "next/navigation";
import { trackProductAnalytics } from "../lib/product-analytics-client.js";
import { firstReadCopy } from "../lib/first-read-copy.js";
import InstallGuide from "./install-guide";
import { landingStoryCopy } from "../lib/landing-story-copy.js";
import { landingHelpCopy } from "../lib/landing-help-copy.js";
import { landingProductCopy } from "../lib/landing-product-copy.js";
import { formatTachoCommandVersionLine } from "../lib/product-version.js";
import { openBetaCopy } from "../lib/open-beta-copy.js";
import { extraLandingCopy } from "../lib/landing-extra-copy.js";
export type Locale = "sr" | "en" | "de" | "ru" | "bg" | "ro" | "hu";
const copy = {
  ...extraLandingCopy,
  sr: {
    title: "Tvoja kartica. Na tvom telefonu.",
    body: "Očitaj karticu vozača. Pregledaj vožnju, rad i odmor — jasno, na jednom mestu.",
    open: "Otvori beta aplikaciju",
    guide: "Prvo povezivanje",
    safety:
      "Bezbednost na prvom mestu: povezivanje i očitavanje samo dok vozilo miruje.",
    features: [
      [
        "Očitaj karticu",
        "Provereni tok za VDO DTCO 4.1 i 4.1a, karticu u slotu 1 i Android Chrome.",
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
    tested: "FIELD PROVEN · VDO DTCO 4.1 / 4.1a · Android Chrome · Slot 1",
    scope:
      "Dokazani download nije potvrda podrške za svaki model. Drugi tahografi i iPhone/Safari nisu potvrđeni za ovu putanju. Dostupna je osnovna provera pauza po standardnom pravilu 4 h 30 min. To nije potpuna analiza prekršaja niti provera DDD potpisa.",
    privacy: "Podaci i privatnost",
    privacyText:
      "Kartična istorija se obrađuje i čuva lokalno. Ograničena tehnička telemetrija služi dijagnostici; ne sadrži ime vozača, raw karticu ili lokaciju. Detalji su u politici privatnosti.",
    beta: "Beta koju proveravamo zajedno",
    betaText:
      "Pristup za sve, bez prijave, potvrde mejla, kupovine i vremenskog ograničenja tokom otvorene bete. Vremena proveri na zvaničnom tahografu.",
    footer:
      "TachoCommand je pomoćni pregled. Tahograf, kartica i važeći propisi ostaju merodavni.",
    legal: ["Privatnost", "Uslovi", "Impressum"],
  },
  en: {
    title: "Your driver card. On your phone.",
    body: "Read your driver card. Review driving, work and rest — in one clear view.",
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
    tested: "FIELD PROVEN · VDO DTCO 4.1 / 4.1a · Android Chrome · Slot 1",
    scope:
      "A proven download does not establish support for every model. Other tachographs and iPhone/Safari are not confirmed for this path. A basic driving-break check under the standard 4 h 30 min rule is available. It is not a full infringement analysis or DDD signature verification.",
    privacy: "Data and privacy",
    privacyText:
      "Card history is processed and stored locally. Limited technical telemetry supports diagnostics; it excludes driver names, raw card data and location. See the privacy policy for details.",
    beta: "A beta we validate together",
    betaText:
      "Access for everyone, without sign-in, email confirmation, purchase or a time limit during the open beta. Cross-check times on the official tachograph.",
    footer:
      "TachoCommand is an auxiliary overview. The tachograph, card and applicable rules remain authoritative.",
    legal: ["Privacy", "Terms", "Imprint"],
  },
  de: {
    title: "Deine Fahrerkarte. Auf deinem Telefon.",
    body: "Fahrerkarte auslesen. Lenkzeit, Arbeit und Ruhe übersichtlich auf deinem Smartphone ansehen.",
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
    tested: "IM FELD BESTÄTIGT · VDO DTCO 4.1 / 4.1a · Android Chrome · Slot 1",
    scope:
      "Ein bestätigter Download belegt nicht die Unterstützung aller Modelle. Andere Tachographen und iPhone/Safari sind für diesen Weg nicht bestätigt. Eine grundlegende Lenkpausenprüfung nach der Standardregel von 4 Std. 30 Min. ist verfügbar. Dies ist keine vollständige Verstoßanalyse oder DDD-Signaturprüfung.",
    privacy: "Daten und Datenschutz",
    privacyText:
      "Kartenverlauf wird lokal verarbeitet und gespeichert. Begrenzte technische Telemetrie dient der Diagnose; Fahrername, rohe Kartendaten und Standort sind ausgeschlossen. Einzelheiten in der Datenschutzerklärung.",
    beta: "Eine Beta, die wir gemeinsam prüfen",
    betaText:
      "Zugang für alle, ohne Anmeldung, E-Mail-Bestätigung, Kauf oder Zeitlimit während der offenen Beta. Zeiten am offiziellen Tachographen prüfen.",
    footer:
      "TachoCommand ist eine ergänzende Übersicht. Tachograph, Karte und geltende Vorschriften bleiben maßgeblich.",
    legal: ["Datenschutz", "Bedingungen", "Impressum"],
  },
} as const;
export default function LandingPage({
  initialLocale = "en",
  canonicalLocaleRoute = false,
}: {
  initialLocale?: Locale;
  canonicalLocaleRoute?: boolean;
}) {
  const locale = initialLocale,
    t = copy[locale],
    product = landingProductCopy[locale],
    help = landingHelpCopy[locale],
    story = landingStoryCopy[locale],
    router = useRouter();
  useEffect(() => {
    const next = canonicalLocaleRoute ? initialLocale : readProductLocale();
    publishProductLocale(next);
    if (!canonicalLocaleRoute) {
      router.replace(localizedLandingHref(next, window.location.search, window.location.hash));
    }
  }, [initialLocale, canonicalLocaleRoute, router]);
  const visual = {
    hu: {"label": "VEZETŐKNEK KÉSZÜLT", "languages": "7 nyelv az alkalmazásban", "ready": "Készen állsz a következő szünetre?", "proof": "Ellenőrizve: DTCO 4.1 / 4.1a", "device": "Android · Chrome"},
    ro: {"label": "PENTRU ȘOFERI", "languages": "7 limbi în aplicație", "ready": "Pregătit pentru următoarea pauză?", "proof": "Verificat pe DTCO 4.1 / 4.1a", "device": "Android · Chrome"},
    bg: {"label": "ЗА ВОДАЧИТЕ", "languages": "7 езика в приложението", "ready": "Готов ли си за следващата почивка?", "proof": "Потвърдено на DTCO 4.1 / 4.1a", "device": "Android · Chrome"},
    ru: {"label": "ДЛЯ ВОДИТЕЛЕЙ", "languages": "7 языков в приложении", "ready": "Готов к следующему перерыву?", "proof": "Проверено на DTCO 4.1 / 4.1a", "device": "Android · Chrome"},
    sr: {label:"NAPRAVLJENO ZA VOZAČE", languages:"7 jezika u aplikaciji", ready:"Spreman za sledeću pauzu?", proof:"Potvrđeno na DTCO 4.1 / 4.1a", device:"Android · Chrome"},
    en: {label:"BUILT FOR DRIVERS", languages:"7 languages in the app", ready:"Ready for your next break?", proof:"Verified on DTCO 4.1 / 4.1a", device:"Android · Chrome"},
    de: {label:"FÜR FAHRER GEMACHT", languages:"7 Sprachen in der App", ready:"Bereit für die nächste Pause?", proof:"Bestätigt auf DTCO 4.1 / 4.1a", device:"Android · Chrome"},
  }[locale];
  const fieldProof = {
    hu: {"eyebrow": "VALÓDI KIOLVASÁS · DTCO 4.1", "title": "Megmutatjuk az eredményt.", "body": "Buszon rögzítve: LIVE-adatok és kártyaolvasás 269 csomagig.", "action": "12 másodperc valódi kiolvasás · angol feliratok", "stat": "269 csomag · 67,3 KB · kész", "poster": "/field-proof-en.webp", "video": "/field-proof-en.mp4"},
    ro: {"eyebrow": "CITIRE REALĂ · DTCO 4.1", "title": "Arătăm rezultatul.", "body": "Înregistrat în autobuz: LIVE și citirea cardului până la 269 de pachete.", "action": "12 secunde de citire reală · text în engleză", "stat": "269 pachete · 67,3 KB · finalizat", "poster": "/field-proof-en.webp", "video": "/field-proof-en.mp4"},
    bg: {"eyebrow": "РЕАЛНО ПРОЧИТАНЕ · DTCO 4.1", "title": "Показваме резултата.", "body": "Запис от автобус: LIVE и прочитане на картата до 269 пакета.", "action": "12 секунди реално прочитане · надписи на английски", "stat": "269 пакета · 67,3 KB · успешно", "poster": "/field-proof-en.webp", "video": "/field-proof-en.mp4"},
    ru: {"eyebrow": "РЕАЛЬНОЕ СЧИТЫВАНИЕ · DTCO 4.1", "title": "Показываем результат.", "body": "Запись из автобуса: LIVE и считывание карты до 269 пакетов.", "action": "12 секунд реального считывания · подписи на английском", "stat": "269 пакетов · 67,3 КБ · успешно", "poster": "/field-proof-en.webp", "video": "/field-proof-en.mp4"},
    sr: {
      eyebrow: "STVARNO OČITAVANJE · DTCO 4.1",
      title: "Stvarna kartica. Stvarno očitavanje.",
      body: "Snimljeno u autobusu: LIVE podaci i čitanje kartice paket po paket — do potvrđenih 269 paketa.",
      poster: "/field-proof-sr.webp",
      video: "/field-proof-sr.mp4",
      action: "Pusti 12 sekundi stvarnog čitanja",
      stat: "269 paketa · 67,3 KB · uspešno",
    },
    en: {
      eyebrow: "REAL READ · DTCO 4.1",
      title: "A real card. A real read.",
      body: "Recorded in a bus: confirmed LIVE data and a driver-card read, packet by packet.",
      poster: "/field-proof-en.webp",
      video: "/field-proof-en.mp4",
      action: "Play 12 seconds of a real read",
      stat: "269 packets · 67.3 KB · completed",
    },
    de: {
      eyebrow: "ECHTES AUSLESEN · DTCO 4.1",
      title: "Aus der Fahrerkabine. Aus der Praxis.",
      body: "Im Bus erprobt: bestätigte LIVE-Daten und das Auslesen der Fahrerkarte — Paket für Paket.",
      poster: "/field-proof-de.webp",
      video: null,
      action: "Feldtest auf dem Smartphone",
      stat: "269 Pakete · 67,3 KB · erfolgreich",
    },
  }[locale];
  const openApp = () => {
    publishProductLocale(locale);
    void trackProductAnalytics("open_app_click", { locale, surface: "landing" });
  };
  const storySteps = [
    {id: 'connection', title: story.steps[0], body: t.steps[1] + ' ' + firstReadCopy[locale].steps[2], image: 'connected', width: 720, height: 238, caption: story.captions[0]},
    {id: 'read', title: story.steps[1], body: help.faq[2][1], image: 'reading', width: 720, height: 464, caption: story.captions[1]},
    {id: 'overview', title: story.steps[2], body: product.features[0][1], image: 'overview', width: 720, height: 800, caption: story.captions[3]},
    {id: 'history', title: story.steps[3], body: product.features[2][1], image: 'history', width: 720, height: 1072, caption: story.captions[4]},
    {id: 'day', title: story.steps[4], body: help.uses[0][1], image: 'day', width: 720, height: 464, caption: story.captions[5]},
    {id: 'periods', title: story.steps[5], body: product.features[1][1], image: 'periods', width: 720, height: 928, caption: story.captions[6]},
    {id: 'breaks', title: story.steps[6], body: product.features[3][1], image: 'break-check', width: 720, height: 500, caption: story.captions[7]},
  ];
  return (
    <main className="tcx-shell" lang={locale}>
      <header className="tcx-nav">
        <Link className="tcx-brand" href={localizedLandingHref(locale)}>
          <span className="tcx-monogram">TC</span> TachoCommand
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
            publishProductLocale(next);
            router.push(localizedLandingHref(next, window.location.search, window.location.hash));
          }}
        >
          <option value="sr">Srpski</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="ru">Русский</option><option value="bg">Български</option>
          <option value="ro">Română</option><option value="hu">Magyar</option>
        </select>
        <Link
          href="/app"
          onClick={openApp}
        >
          {t.open}
        </Link>
      </header>
      <section className="tcx-hero">
        <div className="tcx-hero-image" aria-hidden="true" />
        <div className="tcx-hero-shade" aria-hidden="true" />
        <div className="tcx-hero-copy">
          <span className="tcx-badge"><i />{visual.label}</span>
          <h1>{help.title}</h1>
          <p>{product.hero}</p>
          <p className="tcx-purpose">{help.purpose}</p>
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
          <p className="tcx-free-beta">{product.free}</p>
          <p className="tcx-hero-compatibility"><span aria-hidden="true">✓</span> {visual.device} <span aria-hidden="true">·</span> VDO DTCO 4.1 / 4.1a</p>
        </div>
        <figure className="tcx-app-preview">
          <div className="tcx-app-preview-frame">
            <div className="tcx-app-preview-brand"><span className="tcx-monogram">TC</span><strong>TachoCommand</strong><span className="tcx-screen-dot" aria-hidden="true" /></div>
            <img src="/app-overview-real.webp" width="540" height="1080" alt={firstReadCopy[locale].preview} fetchPriority="high" />
          </div>
          <figcaption>{firstReadCopy[locale].preview}</figcaption>
        </figure>
      </section>
      <div className="tcx-proof">
        <span>{visual.proof}</span><span>{visual.device}</span><span>{visual.languages}</span><span>{t.safety}</span>
      </div>
      <section className="tcx-section tcx-story" aria-labelledby="tcx-product-title">
        <div className="tcx-story-intro">
          <h2 id="tcx-product-title">{story.title}</h2>
          <p>{product.intro}</p>
        </div>
        {storySteps.map((step, i) => <article className="tcx-story-step" key={step.id} id={"show-" + step.id}>
          <div className="tcx-story-text">
            <span className="tcx-story-number" aria-hidden="true">0{i + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            {step.id === 'connection' && <a className="tcx-secondary" href="#connect">{t.guide} ↓</a>}
          </div>
          <div className="tcx-story-visual">
            <figure>
              <div className="tcx-story-image"><img src={"/story/" + step.image + ".webp"} width={step.width} height={step.height} alt={step.title + ". " + step.caption} loading="lazy" /></div>
              <figcaption><strong>{step.caption}</strong><span>{firstReadCopy[locale].preview}</span></figcaption>
            </figure>
            {step.id === 'read' && <figure className="tcx-story-saved">
              <div className="tcx-story-image"><img src="/story/saved.webp" width="720" height="128" alt={story.captions[2]} loading="lazy" /></div>
              <figcaption><strong>{story.captions[2]}</strong><span>{firstReadCopy[locale].preview}</span></figcaption>
            </figure>}
            {step.id === 'day' && <dl className="tcx-story-legend">
              {product.glossary.map(([name, description], index) => <div key={name}><dt><span className={"tcx-story-dot tcx-story-dot-" + index} aria-hidden="true" />{name}</dt><dd>{description}</dd></div>)}
            </dl>}
          </div>
        </article>)}
      </section>
      <section className="tcx-field-proof" aria-labelledby="tcx-field-title">
        <div className="tcx-field-copy">
          <span className="tcx-eyebrow">{fieldProof.eyebrow}</span>
          <h2 id="tcx-field-title">{fieldProof.title}</h2>
          <p>{fieldProof.body}</p>
          <strong>{fieldProof.stat}</strong>
        </div>
        <figure className="tcx-field-media">
          {fieldProof.video ? (
            <video controls playsInline preload="metadata" poster={fieldProof.poster} aria-label={fieldProof.action}>
              <source src={fieldProof.video} type="video/mp4" />
            </video>
          ) : (
            <img src={fieldProof.poster} alt={fieldProof.action} loading="lazy" />
          )}
          <figcaption>{fieldProof.action}</figcaption>
        </figure>
      </section>
      <section className="tcx-section tcx-guide" id="connect">
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
        <div className="tcx-install-row"><InstallGuide locale={locale} /></div>
      </section>
      <section className="tcx-section tcx-faq" aria-labelledby="tcx-faq-title">
        <h2 id="tcx-faq-title">{help.faqTitle}</h2>
        {help.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        <details><summary>{story.more}</summary>{help.uses.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</details>
      </section>
      <section className="tcx-section tcx-trust-grid">
        <article><span className="tcx-trust-symbol" aria-hidden="true">✓</span><h2>{t.trust}</h2><p>{t.scope}</p></article>
        <article><span className="tcx-trust-symbol" aria-hidden="true">⌁</span><h2>{t.privacy}</h2><p>{t.privacyText}</p></article>
      </section>
      <section className="tcx-section tcx-final">
        <span className="tcx-eyebrow">{t.beta}</span><h2>{visual.ready}</h2>
        <p><strong>{openBetaCopy[locale].title}</strong></p>
        <p>{openBetaCopy[locale].intro}</p>
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
            <Link key={path} href={"/" + path + "?lang=" + locale}>
              {t.legal[i]}
            </Link>
          ))}
        </nav>
        <small className="tcx-version-line">{formatTachoCommandVersionLine()}</small>
      </footer>
    </main>
  );
}
