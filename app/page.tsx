import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminHost } from "../lib/admin-host.js";
import LandingPage from "./landing-page";

const title = "TachoCommand — Smart Tacho 2 driver-card cockpit";
const description =
  "TachoCommand čita podržanu Smart Tacho 2 karticu vozača preko Android/Chrome Bluetooth puta i pretvara Gen2 v2 istoriju u jasan 56-day cockpit za profesionalne vozače.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
    languages: {
      sr: "/sr",
      en: "/en",
      de: "/de",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TachoCommand",
    title,
    description,
    locale: "sr_RS",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://tachocommand.com/#website",
      url: "https://tachocommand.com/",
      name: "TachoCommand",
      inLanguage: "sr",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://tachocommand.com/#software",
      name: "TachoCommand",
      url: "https://tachocommand.com/",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Android",
      description,
      browserRequirements: "Android with a supported Chromium browser and Web Bluetooth",
    },
  ],
};

export default async function Home() {
  const host = (await headers()).get("host");
  if (isAdminHost(host)) redirect("/admin");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
