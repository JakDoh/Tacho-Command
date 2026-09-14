"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TrialLauncher from "./trial-launcher";

type Locale = "sr" | "en" | "de";

const LANDING_RELEASE = "2026.09.14-i18n-truth";

const copy = {
  sr: {
    nav: ["Mogućnosti", "Povezivanje", "Cena", "Pitanja"],
    beta: "ZATVORENA BETA • ANDROID",
    titleA: "Jasna smena.",
    titleB: "Mirnija sledeća odluka.",
    intro: "Mobilni cockpit za profesionalne vozače autobusa i kamiona. Tvoja vremena, pauze i status veze — bez buke i bez pretplate.",
    start: "Pokreni 3-dnevni demo",
    starting: "Pokrećem…",
    trialError: "Demo trenutno nije dostupan. Pokušaj ponovo za nekoliko minuta.",
    open: "Otvori aplikaciju",
    how: "Kako se povezuje",
    field: "TERENSKA PROVERA U TOKU",
    fieldText: "Read-only Smart Tacho 2 kandidat proveravamo na stvarnom VDO DTCO 4.1a. Tahograf ostaje zvanični izvor, a nepodržani podaci se ne nagađaju.",
    proof: [["3 DANA", "Beta demo bez kartice"], ["14,99 €", "Founders cena, jednom"], ["SR • EN • DE", "Tri jezika od prvog dana"]],
    featuresTitle: "Napravljeno za kabinu, ne za kancelariju.",
    featuresText: "Najvažnije informacije treba da budu jasne jednim pogledom. Svaka funkcija se objavljuje tek kada može da se dokaže na stvarnom uređaju.",
    features: [
      ["01", "Cockpit bez buke", "Trenutna aktivnost, neprekidna vožnja i pauza u jednom mirnom prikazu."],
      ["02", "Put do 56 dana", "Kartica vozača čuva najmanje 56 dana aktivnosti. TachoCommand istorija ostaje u validaciji dok card-download put ne prođe teren."],
      ["03", "Read-only kandidat", "Core field kandidat koristi read-only RDBI. Svako očitavanje se tokom bete proverava sa zvaničnim tahografom."],
      ["04", "Bez lažne kompatibilnosti", "Trenutni terenski cilj je VDO DTCO 4.1a. Druge Smart Tacho 2 uređaje označavamo tek nakon stvarnog testa."],
    ],
    screensTitle: "TachoCommand u vožnji.",
    screensText: "Ovo je lokalizovan UI preview, ne screenshot sa terena. Prave snimke objavljujemo tek nakon potvrđenog field testa.",
    screenNames: ["Cockpit", "Bluetooth provera", "Lokalni dnevnik"],
    connectTitle: "Povezivanje bez nagađanja.",
    steps: [
      ["01", "Bezbedno parkiraj vozilo", "Bluetooth povezivanje i telefon koristi samo dok vozilo miruje."],
      ["02", "Uključi ITS i saglasnost", "Kartica mora biti ubačena, a dozvola za lične ITS podatke uključena na tahografu kada je potrebna."],
      ["03", "Otvori Chrome na Androidu", "Poveži se na tahograf i dozvoli samo tražene Bluetooth servise."],
      ["04", "Uporedi pre oslanjanja", "Tokom bete svako očitavanje proveri sa zvaničnim prikazom tahografa."],
    ],
    compatibility: "Trenutni terenski cilj",
    supported: "VDO DTCO 4.1a • Android • Chrome • HTTPS",
    notSupported: "Drugi Smart Tacho 2 modeli, iPhone/Safari i stariji tahografi još nisu potvrđeni za ovu beta putanju.",
    priceKicker: "FOUNDERS PONUDA",
    priceTitle: "Jedna kupovina. Bez pretplate.",
    priceNote: "Kupovina ostaje zaključana dok terenski i pravni prolaz ne budu završeni.",
    priceBullets: ["Jedan vozač", "Do dva lična telefona", "Kompatibilna vozila bez vezivanja licence za autobus ili kamion", "Osnovna ažuriranja uključena"],
    locked: "Kupovina se otvara nakon bete",
    once: "JEDNOM",
    demoTitle: "Prvo proveri u svojoj smeni.",
    demoText: "Tri dana punog beta pristupa bez platne kartice i bez automatske naplate.",
    faqTitle: "Kratko i pošteno.",
    faqs: [
      ["Da li menjanjem autobusa gubim licencu?", "Ne. Lična licenca prati vozača, ne vozilo. Kompatibilnost svakog tipa tahografa ipak mora biti potvrđena."],
      ["Da li aplikacija menja tahograf?", "Ne. Trenutni core kandidat koristi read-only očitavanje i ne zamenjuje podatke tahografa ili kartice."],
      ["Da li radi na iPhone-u?", "Ne u prvoj verziji. Web Bluetooth trenutno zahteva podržani Android pregledač, prvenstveno Chrome."],
      ["Šta se šalje u beta izveštaju?", "Verzija aplikacije, telefon/pregledač, stanje veze i pronađeni servisni UUID-ovi. Bez imena, broja kartice, registracije, lokacije i sirovih podataka."],
    ],
    footer: "Pomoćni alat za profesionalne vozače. Tahograf i važeći propisi ostaju merodavni.",
    languageLabel: "Jezik",
    homeAria: "TachoCommand početna",
    navAria: "Glavna navigacija",
    phoneAria: "Lokalizovani TachoCommand cockpit preview",
    offerAria: "Beta ponuda",
    previewKicker: "UI PREVIEW",
    previewStatus: "READ-ONLY BETA",
    previewActivityLabel: "TRENUTNA AKTIVNOST",
    previewActivity: "VOŽNJA",
    previewContinuous: "NEPREKIDNA VOŽNJA",
    previewBreak: "PAUZA",
    previewDaily: "DANAS",
    bleReady: "BLE SPREMAN",
    previewSectionKicker: "LOKALIZOVANI UI",
    fieldTestLabel: "TERENSKI TEST",
    afterFieldTest: "posle potvrđenog terenskog testa",
    legal: { privacy: "Privatnost", terms: "Uslovi", impressum: "Impressum" },
  },
  en: {
    nav: ["Features", "Connection", "Price", "Questions"],
    beta: "CLOSED BETA • ANDROID",
    titleA: "A clearer shift.",
    titleB: "A calmer next decision.",
    intro: "A mobile cockpit for professional bus and truck drivers. Driving, breaks and connection status — without clutter or subscriptions.",
    start: "Start 3-day demo",
    starting: "Starting…",
    trialError: "The demo is temporarily unavailable. Please try again in a few minutes.",
    open: "Open the app",
    how: "How to connect",
    field: "FIELD VALIDATION IN PROGRESS",
    fieldText: "The read-only Smart Tacho 2 candidate is being validated on a real VDO DTCO 4.1a. The tachograph remains authoritative and unsupported data is never guessed.",
    proof: [["3 DAYS", "Beta demo, no payment card"], ["€14.99", "Founders price, once"], ["SR • EN • DE", "Three launch languages"]],
    featuresTitle: "Built for the cab, not the office.",
    featuresText: "Critical information should be clear at a glance. Features are presented as proven only after they pass validation on real hardware.",
    features: [
      ["01", "Quiet cockpit", "Current activity, continuous driving and break status in one calm view."],
      ["02", "Path to 56 days", "The driver card stores at least 56 days of activity. TachoCommand history stays in validation until the card-download path passes field testing."],
      ["03", "Read-only candidate", "The core field candidate uses read-only RDBI. During beta, every result is checked against the official tachograph display."],
      ["04", "No claimed compatibility without proof", "The current field target is VDO DTCO 4.1a. Other Smart Tacho 2 units are listed only after real-device validation."],
    ],
    screensTitle: "TachoCommand on shift.",
    screensText: "This is a localized UI preview, not a field screenshot. Real captures are published only after a confirmed field test.",
    screenNames: ["Cockpit", "Bluetooth check", "Local log"],
    connectTitle: "Connect without guesswork.",
    steps: [
      ["01", "Park safely", "Use Bluetooth setup and the phone only while the vehicle is stationary."],
      ["02", "Enable ITS consent", "Insert the card and enable consent for personal ITS data on the tachograph when required."],
      ["03", "Open Chrome on Android", "Connect to the tachograph and grant only the requested Bluetooth services."],
      ["04", "Compare before relying", "During beta, verify every result against the official tachograph display."],
    ],
    compatibility: "Current field target",
    supported: "VDO DTCO 4.1a • Android • Chrome • HTTPS",
    notSupported: "Other Smart Tacho 2 models, iPhone/Safari and older tachographs are not yet confirmed for this beta path.",
    priceKicker: "FOUNDERS OFFER",
    priceTitle: "One purchase. No subscription.",
    priceNote: "Checkout stays locked until field and legal validation are complete.",
    priceBullets: ["One driver", "Up to two personal phones", "Compatible vehicles without tying the licence to one bus or truck", "Core updates included"],
    locked: "Checkout opens after beta",
    once: "ONCE",
    demoTitle: "Test it on your own shift first.",
    demoText: "Three days of full beta access without a payment card or automatic charge.",
    faqTitle: "Short and honest.",
    faqs: [
      ["Do I lose my licence when changing buses?", "No. A personal licence follows the driver, not the vehicle. Tachograph-model compatibility still has to be confirmed."],
      ["Does the app change the tachograph?", "No. The current core candidate uses read-only access and does not replace tachograph or driver-card data."],
      ["Does it work on iPhone?", "Not in version one. Web Bluetooth currently requires a supported Android browser, primarily Chrome."],
      ["What is included in a beta report?", "App and browser version, connection state and detected service UUIDs. No name, card number, registration, location or raw data."],
    ],
    footer: "Assistant tool for professional drivers. The tachograph and applicable law remain authoritative.",
    languageLabel: "Language",
    homeAria: "TachoCommand home",
    navAria: "Main navigation",
    phoneAria: "Localized TachoCommand cockpit preview",
    offerAria: "Beta offer",
    previewKicker: "UI PREVIEW",
    previewStatus: "READ-ONLY BETA",
    previewActivityLabel: "CURRENT ACTIVITY",
    previewActivity: "DRIVING",
    previewContinuous: "CONTINUOUS DRIVING",
    previewBreak: "BREAK",
    previewDaily: "TODAY",
    bleReady: "BLE READY",
    previewSectionKicker: "LOCALIZED UI",
    fieldTestLabel: "FIELD TEST",
    afterFieldTest: "after confirmed field testing",
    legal: { privacy: "Privacy", terms: "Terms", impressum: "Imprint" },
  },
  de: {
    nav: ["Funktionen", "Verbindung", "Preis", "Fragen"],
    beta: "GESCHLOSSENE BETA • ANDROID",
    titleA: "Eine klare Schicht.",
    titleB: "Eine ruhigere nächste Entscheidung.",
    intro: "Mobiles Cockpit für Bus- und Lkw-Fahrer. Lenkzeit, Pause und Verbindungsstatus — ohne Ablenkung und ohne Abo.",
    start: "3-Tage-Demo starten",
    starting: "Wird gestartet…",
    trialError: "Die Demo ist vorübergehend nicht verfügbar. Bitte in einigen Minuten erneut versuchen.",
    open: "App öffnen",
    how: "Verbindung erklären",
    field: "PRAXISTEST LÄUFT",
    fieldText: "Der read-only Smart-Tacho-2-Kandidat wird an einem realen VDO DTCO 4.1a geprüft. Maßgeblich bleibt der Tachograph; nicht unterstützte Daten werden nicht geraten.",
    proof: [["3 TAGE", "Beta-Demo ohne Zahlungskarte"], ["14,99 €", "Founders-Preis, einmalig"], ["SR • EN • DE", "Drei Sprachen zum Start"]],
    featuresTitle: "Für die Fahrerkabine gebaut.",
    featuresText: "Wichtige Informationen sollen auf einen Blick verständlich sein. Funktionen gelten erst nach Prüfung auf realer Hardware als bestätigt.",
    features: [
      ["01", "Ruhiges Cockpit", "Aktuelle Tätigkeit, ununterbrochene Lenkzeit und Pause in einer ruhigen Ansicht."],
      ["02", "Weg zu 56 Tagen", "Die Fahrerkarte speichert mindestens 56 Tage Aktivität. Die TachoCommand-Historie bleibt in Validierung, bis der Karten-Download im Feld bestanden ist."],
      ["03", "Read-only-Kandidat", "Der Core-Feldkandidat nutzt read-only RDBI. Während der Beta wird jedes Ergebnis mit der offiziellen Tachographenanzeige verglichen."],
      ["04", "Keine Kompatibilität ohne Nachweis", "Aktuelles Feldziel ist VDO DTCO 4.1a. Weitere Smart-Tacho-2-Geräte werden erst nach realem Gerätetest genannt."],
    ],
    screensTitle: "TachoCommand im Einsatz.",
    screensText: "Dies ist eine lokalisierte UI-Vorschau, kein Feld-Screenshot. Echte Aufnahmen veröffentlichen wir erst nach bestätigtem Praxistest.",
    screenNames: ["Cockpit", "Bluetooth-Prüfung", "Lokales Protokoll"],
    connectTitle: "Verbinden ohne Rätselraten.",
    steps: [
      ["01", "Sicher parken", "Bluetooth-Einrichtung und Smartphone nur im stehenden Fahrzeug verwenden."],
      ["02", "ITS-Zustimmung aktivieren", "Karte einstecken und persönliche ITS-Daten am Tachographen freigeben, wenn dies erforderlich ist."],
      ["03", "Chrome auf Android öffnen", "Mit dem Tachographen verbinden und nur die angeforderten Bluetooth-Dienste freigeben."],
      ["04", "Vor Nutzung vergleichen", "In der Beta jedes Ergebnis mit der offiziellen Tachographenanzeige prüfen."],
    ],
    compatibility: "Aktuelles Feldziel",
    supported: "VDO DTCO 4.1a • Android • Chrome • HTTPS",
    notSupported: "Weitere Smart-Tacho-2-Modelle, iPhone/Safari und ältere Tachographen sind für diesen Beta-Pfad noch nicht bestätigt.",
    priceKicker: "FOUNDERS-ANGEBOT",
    priceTitle: "Einmal kaufen. Kein Abo.",
    priceNote: "Der Kauf bleibt gesperrt, bis Praxis- und Rechtsprüfung abgeschlossen sind.",
    priceBullets: ["Ein Fahrer", "Bis zu zwei persönliche Telefone", "Kompatible Fahrzeuge ohne Bindung der Lizenz an einen Bus oder Lkw", "Basis-Updates inklusive"],
    locked: "Kauf startet nach der Beta",
    once: "EINMAL",
    demoTitle: "Zuerst in deiner Schicht testen.",
    demoText: "Drei Tage voller Beta-Zugang ohne Zahlungskarte und automatische Abbuchung.",
    faqTitle: "Kurz und ehrlich.",
    faqs: [
      ["Verliere ich beim Buswechsel die Lizenz?", "Nein. Die persönliche Lizenz gehört zum Fahrer, nicht zum Fahrzeug. Die Kompatibilität des Tachographenmodells muss dennoch bestätigt sein."],
      ["Verändert die App den Tachographen?", "Nein. Der aktuelle Core-Kandidat nutzt read-only Zugriff und ersetzt keine Tachographen- oder Kartendaten."],
      ["Funktioniert es auf dem iPhone?", "Nicht in Version eins. Web Bluetooth benötigt derzeit einen unterstützten Android-Browser, vor allem Chrome."],
      ["Was enthält der Beta-Bericht?", "App-/Browser-Version, Verbindungsstatus und erkannte Service-UUIDs. Kein Name, keine Kartennummer, kein Kennzeichen, Standort oder Rohdaten."],
    ],
    footer: "Hilfswerkzeug für Berufskraftfahrer. Tachograph und geltende Vorschriften bleiben maßgeblich.",
    languageLabel: "Sprache",
    homeAria: "TachoCommand Startseite",
    navAria: "Hauptnavigation",
    phoneAria: "Lokalisierte TachoCommand-Cockpit-Vorschau",
    offerAria: "Beta-Angebot",
    previewKicker: "UI-VORSCHAU",
    previewStatus: "READ-ONLY BETA",
    previewActivityLabel: "AKTUELLE TÄTIGKEIT",
    previewActivity: "LENKEN",
    previewContinuous: "UNUNTERBROCHENE LENKZEIT",
    previewBreak: "PAUSE",
    previewDaily: "HEUTE",
    bleReady: "BLE BEREIT",
    previewSectionKicker: "LOKALISIERTE UI",
    fieldTestLabel: "PRAXISTEST",
    afterFieldTest: "nach bestätigtem Praxistest",
    legal: { privacy: "Datenschutz", terms: "Bedingungen", impressum: "Impressum" },
  },
} as const;

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("sr");

  useEffect(() => {
    const saved = window.localStorage.getItem("tachocommand.locale");
    const browser = navigator.language.toLowerCase();
    const next: Locale = saved === "de" || saved === "en" || saved === "sr"
      ? saved
      : browser.startsWith("de") ? "de" : browser.startsWith("en") ? "en" : "sr";
    const timeout = window.setTimeout(() => setLocale(next), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const t = copy[locale];
  const changeLocale = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem("tachocommand.locale", next);
    document.documentElement.lang = next === "sr" ? "sr-Latn" : next;
  };

  return (
    <main className="landing-shell" data-release={LANDING_RELEASE}>
      <header className="landing-nav">
        <a className="landing-brand" href="#top" aria-label={t.homeAria}>
          <span className="landing-logo">TC</span>
          <strong>Tacho<span>Command</span></strong>
        </a>
        <nav aria-label={t.navAria}>
          <a href="#features">{t.nav[0]}</a>
          <a href="#connect">{t.nav[1]}</a>
          <a href="#price">{t.nav[2]}</a>
          <a href="#faq">{t.nav[3]}</a>
        </nav>
        <div className="landing-actions">
          <label className="landing-language">
            <span className="sr-only">{t.languageLabel}</span>
            <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
              <option value="sr">SR</option>
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>
          </label>
          <Link className="nav-app-link" href="/app">{t.open}</Link>
        </div>
      </header>

      <section className="landing-hero" id="top">
        <div className="hero-grid-glow" />
        <div className="landing-hero-copy">
          <span className="beta-badge"><i />{t.beta}</span>
          <h1>{t.titleA}<br /><span>{t.titleB}</span></h1>
          <p>{t.intro}</p>
          <div className="hero-actions">
            <TrialLauncher label={t.start} loadingLabel={t.starting} errorLabel={t.trialError} className="landing-primary" />
            <a className="landing-secondary" href="#connect">{t.how}<span>↓</span></a>
          </div>
          <aside className="field-note">
            <span className="field-icon">⌁</span>
            <div><strong>{t.field}</strong><p>{t.fieldText}</p></div>
          </aside>
        </div>

        <div className="hero-phone-wrap" aria-label={t.phoneAria}>
          <div className="hero-phone-halo" />
          <div className="hero-phone">
            <div className="phone-speaker" />
            <div style={{ height: "100%", display: "grid", alignContent: "start", gap: ".75rem", padding: "3rem 1rem 1rem", background: "linear-gradient(160deg,#07101d,#0d1929)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem" }}>
                <span style={{ color: "#8ea0b8", fontSize: ".58rem", fontWeight: 900, letterSpacing: ".12em" }}>{t.previewKicker}</span>
                <span style={{ color: "#8deacb", fontSize: ".52rem", fontWeight: 900 }}>{t.previewStatus}</span>
              </div>
              <div style={{ border: "1px solid #20344e", borderRadius: "1rem", padding: "1rem", background: "#0d1929" }}>
                <small style={{ color: "#8ea0b8", fontWeight: 800 }}>{t.previewActivityLabel}</small>
                <div style={{ marginTop: ".35rem", color: "#8deacb", fontSize: "1.65rem", fontWeight: 950 }}>{t.previewActivity}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem" }}>
                {[[t.previewContinuous, "03:42"], [t.previewBreak, "00:18"], [t.previewDaily, "06:30"]].map(([label, value], index) => (
                  <div key={label} style={{ gridColumn: index === 2 ? "1 / -1" : undefined, border: "1px solid #20344e", borderRadius: ".85rem", padding: ".75rem", background: "#0a1623" }}>
                    <small style={{ display: "block", color: "#8ea0b8", fontSize: ".5rem", fontWeight: 850 }}>{label}</small>
                    <strong style={{ display: "block", marginTop: ".2rem", fontFamily: "ui-monospace, monospace", fontSize: "1.1rem" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span className="floating-chip chip-top"><i />{t.bleReady}</span>
          <span className="floating-chip chip-bottom">SR • EN • DE</span>
        </div>
      </section>

      <section className="proof-strip" aria-label={t.offerAria}>
        {t.proof.map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className="landing-section" id="features">
        <div className="section-intro">
          <span className="landing-kicker">TACHOCOMMAND</span>
          <h2>{t.featuresTitle}</h2>
          <p>{t.featuresText}</p>
        </div>
        <div className="feature-grid">
          {t.features.map(([number, title, description]) => (
            <article className="feature-tile" key={number}>
              <span>{number}</span><h3>{title}</h3><p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section screenshot-section">
        <div className="section-intro">
          <span className="landing-kicker">{t.previewSectionKicker}</span>
          <h2>{t.screensTitle}</h2>
          <p>{t.screensText}</p>
        </div>
        <div className="screenshot-grid">
          {t.screenNames.map((name, index) => (
            <figure key={name}>
              <div className="screen-frame screen-placeholder" aria-label={`${name} — ${t.afterFieldTest}`}>
                <span>{index === 0 ? t.previewKicker : t.fieldTestLabel}</span>
                <strong>{name}</strong>
                <i>{index === 0 ? "✓" : "→"}</i>
              </div>
              <figcaption><span>0{index + 1}</span>{name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="connect-section" id="connect">
        <div className="connect-copy">
          <span className="landing-kicker">SMART TACHO 2</span>
          <h2>{t.connectTitle}</h2>
          <div className="connect-steps">
            {t.steps.map(([number, title, description]) => (
              <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>
            ))}
          </div>
        </div>
        <aside className="compat-card">
          <span className="compat-icon">⌁</span>
          <p className="landing-kicker">{t.compatibility}</p>
          <h3>{t.supported}</h3>
          <p>{t.notSupported}</p>
          <Link href="/app">{t.open}<span>→</span></Link>
        </aside>
      </section>

      <section className="pricing-section" id="price">
        <div className="price-card">
          <div>
            <span className="landing-kicker">{t.priceKicker}</span>
            <h2>{t.priceTitle}</h2>
            <p>{t.priceNote}</p>
          </div>
          <div className="price-value"><strong>14,99</strong><span>€</span><small>{t.once}</small></div>
          <ul>{t.priceBullets.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
          <button type="button" disabled>{t.locked}</button>
        </div>
        <div className="demo-card">
          <span>03</span><h3>{t.demoTitle}</h3><p>{t.demoText}</p>
          <TrialLauncher label={t.start} loadingLabel={t.starting} errorLabel={t.trialError} className="landing-secondary demo-button" />
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-intro"><span className="landing-kicker">FAQ</span><h2>{t.faqTitle}</h2></div>
        <div className="faq-list">
          {t.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-brand"><span className="landing-logo">TC</span><strong>Tacho<span>Command</span></strong></div>
        <p>{t.footer}</p>
        <div><Link href="/privacy">{t.legal.privacy}</Link><Link href="/terms">{t.legal.terms}</Link><Link href="/impressum">{t.legal.impressum}</Link></div>
      </footer>
    </main>
  );
}
