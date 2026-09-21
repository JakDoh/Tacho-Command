"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./install-guide.module.css";

type Locale = "sr" | "en" | "de";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const copy = {
  sr: {
    button: "Instaliraj TachoCommand",
    installed: "TachoCommand je instaliran",
    kicker: "ANDROID • CHROME",
    title: "Dodaj TachoCommand na početni ekran.",
    intro: "Posle instalacije dobijaš TachoCommand ikonu i standalone prikaz bez browser trake.",
    steps: [
      ["01", "Otvori meni ⋮", "U Chrome-u dodirni tri tačke gore desno."],
      ["02", "Izaberi instalaciju", "Dodirni „Install app“ ili „Dodaj na početni ekran“ — naziv može malo da se razlikuje po verziji Chrome-a."],
      ["03", "Potvrdi", "Izaberi „Install“ / „Dodaj“. TachoCommand ikona će se pojaviti na početnom ekranu."],
      ["04", "Pokreni preko ikone", "Sledeći put otvori TachoCommand direktno sa početnog ekrana kao aplikaciju."],
    ],
    direct: "Instaliraj sada",
    directHint: "Chrome je ponudio direktnu instalaciju na ovom telefonu.",
    manualHint: "Ako nema opcije za instalaciju, osveži stranicu u Chrome-u preko HTTPS veze i proveri da nije otvorena u ugrađenom browseru druge aplikacije.",
    close: "Zatvori",
  },
  en: {
    button: "Install TachoCommand",
    installed: "TachoCommand is installed",
    kicker: "ANDROID • CHROME",
    title: "Add TachoCommand to your Home screen.",
    intro: "After installation you get a TachoCommand icon and a standalone view without the browser bar.",
    steps: [
      ["01", "Open the ⋮ menu", "In Chrome, tap the three dots in the top-right corner."],
      ["02", "Choose install", "Tap “Install app” or “Add to Home screen”. The wording can vary by Chrome version."],
      ["03", "Confirm", "Tap “Install” / “Add”. The TachoCommand icon appears on your Home screen."],
      ["04", "Launch from the icon", "Next time, open TachoCommand directly from the Home screen like an app."],
    ],
    direct: "Install now",
    directHint: "Chrome offered direct installation on this phone.",
    manualHint: "If the install option is missing, reload the page in Chrome over HTTPS and make sure it is not open inside another app's embedded browser.",
    close: "Close",
  },
  de: {
    button: "TachoCommand installieren",
    installed: "TachoCommand ist installiert",
    kicker: "ANDROID • CHROME",
    title: "TachoCommand zum Startbildschirm hinzufügen.",
    intro: "Nach der Installation erhältst du ein TachoCommand-Symbol und eine eigenständige Ansicht ohne Browserleiste.",
    steps: [
      ["01", "⋮ Menü öffnen", "In Chrome oben rechts auf die drei Punkte tippen."],
      ["02", "Installation wählen", "„App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen. Die Bezeichnung kann je nach Chrome-Version variieren."],
      ["03", "Bestätigen", "„Installieren“ / „Hinzufügen“ bestätigen. Das TachoCommand-Symbol erscheint auf dem Startbildschirm."],
      ["04", "Über das Symbol starten", "TachoCommand künftig direkt vom Startbildschirm wie eine App öffnen."],
    ],
    direct: "Jetzt installieren",
    directHint: "Chrome bietet auf diesem Gerät eine direkte Installation an.",
    manualHint: "Fehlt die Installationsoption, die Seite in Chrome über HTTPS neu laden und prüfen, dass sie nicht im eingebetteten Browser einer anderen App geöffnet ist.",
    close: "Schließen",
  },
} as const;

function readLocale(): Locale {
  if (typeof window === "undefined") return "sr";
  const saved = window.localStorage.getItem("tachocommand-locale");
  if (saved === "sr" || saved === "en" || saved === "de") return saved;
  const language = window.navigator.language.toLowerCase();
  if (language.startsWith("de")) return "de";
  if (language.startsWith("en")) return "en";
  return "sr";
}

function subscribeLocale(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export default function InstallGuide() {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => "sr" as Locale);
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) queueMicrotask(() => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installNow = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  if (installed) {
    return <div className={styles.installed} aria-live="polite">✓ {t.installed}</div>;
  }

  return (
    <>
      <button className={styles.fab} type="button" onClick={() => installPrompt ? void installNow() : setOpen(true)}>
        <span>＋</span>{t.button}
      </button>
      {open && (
        <div className={styles.backdrop} role="presentation" onClick={() => setOpen(false)}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="tc-install-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.handle} />
            <span className={styles.kicker}>{t.kicker}</span>
            <h2 id="tc-install-title">{t.title}</h2>
            <p className={styles.intro}>{t.intro}</p>
            <div className={styles.steps}>
              {t.steps.map(([number, title, body]) => (
                <article key={number}>
                  <span>{number}</span>
                  <div><h3>{title}</h3><p>{body}</p></div>
                </article>
              ))}
            </div>
            {installPrompt ? (
              <div className={styles.directBox}>
                <p>{t.directHint}</p>
                <button type="button" onClick={() => void installNow()}>{t.direct}</button>
              </div>
            ) : <p className={styles.hint}>{t.manualHint}</p>}
            <button className={styles.close} type="button" onClick={() => setOpen(false)}>{t.close}</button>
          </section>
        </div>
      )}
    </>
  );
}
