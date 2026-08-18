import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TachoCommand — tvoj vozački cockpit",
  description:
    "Mobilni pomoćnik za profesionalne vozače autobusa i kamiona. Pregled vožnje, pauza, smene i Smart Tacho 2 beta povezivanja.",
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
  themeColor: "#08111f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}
