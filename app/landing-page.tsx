"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import TrialLauncher from "./trial-launcher";

type Locale = "cs" | "en" | "de";

const copy = {
  cs: {
    nav: ["Funkce", "Připojení", "Cena", "Dotazy"],
    beta: "UZAVŘENÁ BETA • ANDROID",
    titleA: "Jasná směna.",
    titleB: "Klidnější další rozhodnutí.",
    intro: "Mobilní cockpit pro profesionální řidiče autobusů a kamionů. Vaše časy, přestávky a stav připojení — bez rušení a bez předplatného.",
    start: "Spustit 3denní demo",
    open: "Otevřít aplikaci",
    how: "Jak se připojit",
    field: "PROBÍHÁ POLNÍ TESTOVÁNÍ",
    fieldText: "Čtení Smart Tacho 2 přes Bluetooth aktuálně ověřujeme na skutečných autobusech a kamionech. Demo a manuální cockpit jsou k dispozici; tachograf zůstává oficiálním zdrojem.",
    proof: [["3 DNY", "Beta demo bez karty"], ["14,99 €", "Founders cena, jednorázově"], ["∞ VOZIDEL", "Jedna osobní licence"]],
    featuresTitle: "Vyrobeno pro kabinu, ne pro kancelář.",
    featuresText: "Nejdůležitější informace na jeden pohled s velkými ovládacími prvky přizpůsobenými pro telefon.",
    features: [
      ["01", "Cockpit bez rušení", "Kontinuální a denní jízda, směna a přestávka na jedné přehledné obrazovce."],
      ["02", "Smart Tacho 2 BLE", "Kontrolované ověření standardních Bluetooth služeb VDO a Stoneridge."],
      ["03", "Lokální a soukromé", "Manuální záznamy zůstávají v telefonu. Beta report neobsahuje jméno, kartu ani registrační značku."],
      ["04", "CS • EN • DE", "Tři jazyky v první verzi s prostorem pro budoucí rozšíření."],
    ],
    screensTitle: "TachoCommand během jízdy.",
    screensText: "První reálná beta obrazovka. Bluetooth ověření a deník zveřejníme až po polním testu.",
    screenNames: ["Cockpit", "Bluetooth ověření", "Lokální deník"],
    connectTitle: "Připojení bez dohadů.",
    steps: [
      ["01", "Bezpečně zaparkujte vozidlo", "Bluetooth párování a telefon používejte pouze tehdy, když vozidlo stojí."],
      ["02", "Zapněte ITS a souhlas", "Karta musí být vložena a souhlas s osobními ITS údaji povolen na tachografu."],
      ["03", "Otevřete Chrome na Androidu", "Klepněte na „Připojit tachograf“ a potvrďte stejné šestimístné číslo na obou displejích."],
      ["04", "Před spolehnutím porovnejte", "Během bety každé načtení ověřujeme s oficiálním displejem tachografu."],
    ],
    compatibility: "Počáteční kompatibilita",
    supported: "Smart Tacho 2 • Android • Chrome • HTTPS",
    notSupported: "iPhone/Safari a starší tachografy nejsou v současné době podporovány.",
    priceKicker: "FOUNDERS NABÍDKA",
    priceTitle: "Jeden nákup. Žádné předplatné.",
    priceNote: "Cena se odemkne až po úspěšném polním a právním ověření.",
    priceBullets: ["Jeden řidič", "Až dva osobní telefony", "Neomezeně kompatibilních vozidel", "Základní aktualizace v ceně"],
    locked: "Nákup se otevře po skončení bety",
    demoTitle: "Nejprve vyzkoušejte ve své směně.",
    demoText: "Tři dny plného beta přístupu bez platební karty a bez automatických plateb.",
    faqTitle: "Stručně a na rovinu.",
    faqs: [
      ["Ztratím při změně autobusu licenci?", "Ne. Osobní licence je vázána na řidiče, nikoli na vozidlo. Můžete připojit neomezený počet kompatibilních autobusů a kamionů."],
      ["Nahrazuje aplikace tachograf?", "Ne. TachoCommand je pomocné zobrazení. Neupravuje, nepodepisuje ani nenahrazuje data tachografu nebo karty řidiče."],
      ["Funguje na iPhone?", "V první verzi ne. Web Bluetooth v současnosti vyžaduje podporovaný prohlížeč na Androidu, primárně Chrome."],
      ["Co se odesílá v beta hlášení?", "Verze aplikace, telefon/prohlížeč, stav připojení a nalezené UUID služeb. Žádné jméno, číslo karty, SPZ, poloha ani surová data."],
    ],
    footer: "Pomocný nástroj pro profesionální řidiče. Tachograf a platné předpisy zůstávají závazné.",
  },
  en: {
    nav: ["Features", "Connection", "Price", "Questions"],
    beta: "CLOSED BETA • ANDROID",
    titleA: "A clearer shift.",
    titleB: "A calmer next decision.",
    intro: "A mobile cockpit for professional bus and truck drivers. Driving, breaks and connection status — without clutter or subscriptions.",
    start: "Start 3-day demo", open: "Open the app", how: "How to connect",
    field: "FIELD VALIDATION IN PROGRESS",
    fieldText: "Smart Tacho 2 Bluetooth reading is being validated in real buses and trucks. The demo and manual cockpit are available; the tachograph remains authoritative.",
    proof: [["3 DAYS", "Beta demo, no card"], ["€14.99", "Founders price, once"], ["∞ VEHICLES", "One personal licence"]],
    featuresTitle: "Built for the cab, not the office.",
    featuresText: "Critical information is one glance away, with large controls made for a phone.",
    features: [
      ["01", "Quiet cockpit", "Continuous and daily driving, shift and break in one focused screen."],
      ["02", "Smart Tacho 2 BLE", "Controlled checks of standard VDO and Stoneridge Bluetooth services."],
      ["03", "Local and private", "Manual notes stay on the phone. Beta reports exclude personal identifiers."],
      ["04", "CS • EN • DE", "Three launch languages with room to expand later."],
    ],
    screensTitle: "TachoCommand on shift.", screensText: "The first real beta screen. Bluetooth and log captures follow only after field testing.", screenNames: ["Cockpit", "Bluetooth check", "Local log"],
    connectTitle: "Connect without guesswork.",
    steps: [
      ["01", "Park safely", "Use Bluetooth setup and the phone only while the vehicle is stationary."],
      ["02", "Enable ITS consent", "Insert the card and enable consent for personal ITS data on the tachograph."],
      ["03", "Open Chrome on Android", "Tap connect and confirm the same six-digit number on both screens."],
      ["04", "Compare before relying", "During beta, verify every result against the official tachograph display."],
    ],
    compatibility: "Initial compatibility", supported: "Smart Tacho 2 • Android • Chrome • HTTPS", notSupported: "iPhone/Safari and older tachographs are not currently supported.",
    priceKicker: "FOUNDERS OFFER", priceTitle: "One purchase. No subscription.", priceNote: "Checkout unlocks only after field and legal validation.",
    priceBullets: ["One driver", "Up to two personal phones", "Unlimited compatible vehicles", "Core updates included"], locked: "Checkout opens after beta",
    demoTitle: "Test it on your own shift first.", demoText: "Three days of full beta access without a payment card or automatic charge.",
    faqTitle: "Short and honest.",
    faqs: [
      ["Do I lose my licence when changing buses?", "No. A personal licence follows the driver, not the vehicle. Connect unlimited compatible buses and trucks."],
      ["Does the app change the tachograph?", "No. TachoCommand is an assistant display and never replaces signed tachograph or driver-card data."],
      ["Does it work on iPhone?", "Not in version one. Web Bluetooth currently requires a supported Android browser, primarily Chrome."],
      ["What is included in a beta report?", "App and browser version, connection state and detected service UUIDs. No name, card number, registration, location or raw data."],
    ],
    footer: "Assistant tool for professional drivers. The tachograph and applicable law remain authoritative.",
  },
  de: {
    nav: ["Funktionen", "Verbindung", "Preis", "Fragen"],
    beta: "GESCHLOSSENE BETA • ANDROID",
    titleA: "Eine klare Schicht.",
    titleB: "Eine ruhigere nächste Entscheidung.",
    intro: "Mobiles Cockpit für Bus- und Lkw-Fahrer. Lenkzeit, Pause und Verbindungsstatus — ohne Ablenkung und ohne Abo.",
    start: "3-Tage-Demo starten", open: "App öffnen", how: "Verbindung erklären",
    field: "PRAXISTEST LÄUFT",
    fieldText: "Das Auslesen von Smart Tacho 2 per Bluetooth wird derzeit in echten Bussen und Lkw geprüft. Demo und manuelles Cockpit sind verfügbar; der Tachograph bleibt maßgeblich.",
    proof: [["3 TAGE", "Beta-Demo ohne Karte"], ["14,99 €", "Founders-Preis, einmalig"], ["∞ FAHRZEUGE", "Eine persönliche Lizenz"]],
    featuresTitle: "Für die Fahrerkabine gebaut.",
    featuresText: "Wichtige Informationen auf einen Blick und große Bedienelemente für das Smartphone.",
    features: [
      ["01", "Ruhiges Cockpit", "Ununterbrochene und tägliche Lenkzeit, Schicht und Pause auf einem Bildschirm."],
      ["02", "Smart Tacho 2 BLE", "Kontrollierte Prüfung standardisierter VDO- und Stoneridge-Bluetooth-Dienste."],
      ["03", "Lokal und privat", "Manuelle Notizen bleiben auf dem Telefon. Beta-Berichte enthalten keine Identifikatoren."],
      ["04", "CS • EN • DE", "Drei Sprachen zum Start, später erweiterbar."],
    ],
    screensTitle: "TachoCommand im Einsatz.", screensText: "Der erste echte Beta-Bildschirm. Bluetooth und Protokoll folgen erst nach dem Praxistest.", screenNames: ["Cockpit", "Bluetooth-Prüfung", "Lokales Protokoll"],
    connectTitle: "Verbinden ohne Rätselraten.",
    steps: [
      ["01", "Sicher parken", "Bluetooth-Einrichtung und Smartphone nur im stehenden Fahrzeug verwenden."],
      ["02", "ITS-Zustimmung aktivieren", "Karte einstecken und persönliche ITS-Daten am Tachographen freigeben."],
      ["03", "Chrome auf Android öffnen", "Verbinden drücken und dieselbe sechsstellige Zahl auf beiden Geräten bestätigen."],
      ["04", "Vor Nutzung vergleichen", "In der Beta jedes Ergebnis mit der offiziellen Tachographenanzeige prüfen."],
    ],
    compatibility: "Erste Kompatibilität", supported: "Smart Tacho 2 • Android • Chrome • HTTPS", notSupported: "iPhone/Safari und ältere Tachographen werden derzeit nicht unterstützt.",
    priceKicker: "FOUNDERS-ANGEBOT", priceTitle: "Einmal kaufen. Kein Abo.", priceNote: "Der Kauf wird erst nach Praxis- und Rechtsprüfung freigeschaltet.",
    priceBullets: ["Ein Fahrer", "Bis zu zwei persönliche Telefone", "Unbegrenzt kompatible Fahrzeuge", "Basis-Updates inklusive"], locked: "Kauf startet nach der Beta",
    demoTitle: "Zuerst in deiner Schicht testen.", demoText: "Drei Tage voller Beta-Zugang ohne Zahlungskarte und automatische Abbuchung.",
    faqTitle: "Kurz und ehrlich.",
    faqs: [
      ["Verliere ich beim Buswechsel die Lizenz?", "Nein. Die persönliche Lizenz gehört zum Fahrer, nicht zum Fahrzeug. Kompatible Fahrzeuge sind unbegrenzt."],
      ["Verändert die App den Tachographen?", "Nein. TachoCommand ist ein Hilfsdisplay und ersetzt keine signierten Tachographen- oder Kartendaten."],
      ["Funktioniert es auf dem iPhone?", "Nicht in Version eins. Web Bluetooth benötigt derzeit einen unterstützten Android-Browser, vor allem Chrome."],
      ["Was enthält der Beta-Bericht?", "App-/Browser-Version, Verbindungsstatus und erkannte Service-UUIDs. Kein Name, keine Kartennummer, kein Kennzeichen, Standort oder Rohdaten."],
    ],
    footer: "Hilfswerkzeug für Berufskraftfahrer. Tachograph und geltende Vorschriften bleiben maßgeblich.",
  },
} as const;

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("cs");

  useEffect(() => {
    const saved = window.localStorage.getItem("tachocommand.locale");
    const browser = navigator.language.toLowerCase();
    const next: Locale = saved === "de" || saved === "en" || saved === "cs"
      ? saved
      : browser.startsWith("de") ? "de" : browser.startsWith("en") ? "en" : "cs";
    const timeout = window.setTimeout(() => setLocale(next), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const t = copy[locale];
  const changeLocale = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem("tachocommand.locale", next);
    document.documentElement.lang = next;
  };

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <a className="landing-brand" href="#top" aria-label="TachoCommand úvod">
          <span className="landing-logo">TC</span>
          <strong>Tacho<span>Command</span></strong>
        </a>
        <nav aria-label="Landing navigace">
          <a href="#features">{t.nav[0]}</a>
          <a href="#connect">{t.nav[1]}</a>
          <a href="#price">{t.nav[2]}</a>
          <a href="#faq">{t.nav[3]}</a>
        </nav>
        <div className="landing-actions">
          <label className="landing-language">
            <span className="sr-only">Jazyk</span>
            <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
              <option value="cs">CS</option>
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
            <TrialLauncher label={t.start} className="landing-primary" />
            <a className="landing-secondary" href="#connect">{t.how}<span>↓</span></a>
          </div>
          <aside className="field-note">
            <span className="field-icon">⌁</span>
            <div><strong>{t.field}</strong><p>{t.fieldText}</p></div>
          </aside>
        </div>

        <div className="hero-phone-wrap" aria-label="TachoCommand aplikace">
          <div className="hero-phone-halo" />
          <div className="hero-phone">
            <div className="phone-speaker" />
            <Image src="/screenshots/cockpit.webp" alt="TachoCommand cockpit" width={520} height={725} priority unoptimized />
          </div>
          <span className="floating-chip chip-top"><i />BLE READY</span>
          <span className="floating-chip chip-bottom">CS • EN • DE</span>
        </div>
      </section>

      <section className="proof-strip" aria-label="Nabídka">
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
          <span className="landing-kicker">REAL BETA UI</span>
          <h2>{t.screensTitle}</h2>
          <p>{t.screensText}</p>
        </div>
        <div className="screenshot-grid">
          <figure>
            <div className="screen-frame"><Image src="/screenshots/cockpit.webp" alt={t.screenNames[0]} width={520} height={725} unoptimized /></div>
            <figcaption><span>01</span>{t.screenNames[0]}</figcaption>
          </figure>
          {t.screenNames.slice(1).map((name, index) => (
            <figure key={name}>
              <div className="screen-frame screen-placeholder" aria-label={`${name} — po polním testu`}>
                <span>FIELD TEST</span>
                <strong>{name}</strong>
                <i>→</i>
              </div>
              <figcaption><span>0{index + 2}</span>{name}</figcaption>
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
          <div className="price-value"><strong>14,99</strong><span>€</span><small>JEDNORÁZOVĚ</small></div>
          <ul>{t.priceBullets.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
          <button type="button" disabled>{t.locked}</button>
        </div>
        <div className="demo-card">
          <span>03</span><h3>{t.demoTitle}</h3><p>{t.demoText}</p>
          <TrialLauncher label={t.start} className="landing-secondary demo-button" />
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
        <div><Link href="/privacy">Soukromí</Link><Link href="/terms">Podmínky</Link><Link href="/impressum">Impressum</Link></div>
      </footer>
    </main>
  );
}
