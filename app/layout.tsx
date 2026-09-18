import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing-oled.css";
import ServiceWorkerRegister from "./service-worker-register";
import ProductAnalyticsObserver from "./product-analytics-observer";

export const metadata: Metadata = {
  metadataBase: new URL("https://tachocommand.com"),
  title: {
    default: "TachoCommand — OLED cockpit za profesionalne vozače",
    template: "%s | TachoCommand",
  },
  description:
    "TachoCommand čita podržanu Smart Tacho 2 driver karticu preko telefona, pretvara Gen2 v2 istoriju u jasan 56-day timeline i prikazuje vožnju, pauze, upozorenja i pravne rule profile bez nagađanja.",
  manifest: "/manifest.webmanifest",
  applicationName: "TachoCommand",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TachoCommand",
  },
  formatDetection: { telephone: false },
  other: { "codex-preview": "development", "application-status": "closed-beta" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#020304",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr">
      <body>
        <ServiceWorkerRegister />
        <ProductAnalyticsObserver />
        {children}
      </body>
    </html>
  );
}
