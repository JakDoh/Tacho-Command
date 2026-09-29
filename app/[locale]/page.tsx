import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPage, { type Locale } from "../landing-page";

const locales = ["sr", "en", "de", "ru", "bg", "ro", "hu"] as const satisfies readonly Locale[];

const seo = {
  hu: {"title": "TachoCommand — A te napod. A te kezedben.", "description": "Csatlakoztasd a tachográfot. Olvasd ki a kártyát. Tekintsd át az 56 napodat — érthetően, a telefonodon.", "openGraphLocale": "hu_HU"},
  ro: {"title": "TachoCommand — Ziua ta. În mâinile tale.", "description": "Conectează tahograful. Citește cardul. Înțelege cele 56 de zile — clar și direct pe telefon.", "openGraphLocale": "ro_RO"},
  bg: {"title": "TachoCommand — Твоят ден. В твоите ръце.", "description": "Свържи тахографа. Прочети картата. Разгледай своите 56 дни — ясно и направо на телефона.", "openGraphLocale": "bg_BG"},
  ru: {"title": "TachoCommand — Твой день. В твоих руках.", "description": "Подключи тахограф. Считай карту. Посмотри свои 56 дней — понятно и прямо на телефоне.", "openGraphLocale": "ru_RU"},
  sr: {
    title: "TachoCommand — Smart Tacho 2 cockpit za profesionalne vozače",
    description:
      "Očitaj podržanu Smart Tacho 2 karticu vozača preko Android/Chrome Bluetooth puta i pretvori Gen2 v2 istoriju u jasan 56-day cockpit.",
    openGraphLocale: "sr_RS",
  },
  en: {
    title: "TachoCommand — Smart Tacho 2 driver-card cockpit",
    description:
      "Read a supported Smart Tacho 2 driver card through Android/Chrome Bluetooth and turn Gen2 v2 history into a clear 56-day cockpit.",
    openGraphLocale: "en_GB",
  },
  de: {
    title: "TachoCommand — Smart Tacho 2 Fahrerkarte-Cockpit",
    description:
      "Unterstützte Smart Tacho 2 Fahrerkarte per Android/Chrome Bluetooth auslesen und Gen2-v2-Historie als klares 56-Tage-Cockpit anzeigen.",
    openGraphLocale: "de_AT",
  },
} as const;

const languageAlternates = {
  hu: "/hu",
  ro: "/ro",
  bg: "/bg",
  ru: "/ru",
  sr: "/sr",
  en: "/en",
  de: "/de",
  "x-default": "/",
};

const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const meta = seo[locale];
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates,
    },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: "TachoCommand",
      title: meta.title,
      description: meta.description,
      locale: meta.openGraphLocale,
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function LocaleLandingPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const meta = seo[locale];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://tachocommand.com/${locale}#page`,
        url: `https://tachocommand.com/${locale}`,
        name: meta.title,
        description: meta.description,
        inLanguage: locale,
        isPartOf: { "@id": "https://tachocommand.com/#website" },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://tachocommand.com/#software",
        name: "TachoCommand",
        url: "https://tachocommand.com/",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Android",
        description: meta.description,
        inLanguage: locale,
        browserRequirements: "Android with a supported Chromium browser and Web Bluetooth",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage initialLocale={locale} canonicalLocaleRoute />
    </>
  );
}
