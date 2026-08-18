import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TachoCommand — vozački cockpit",
  description:
    "Mobilni pomoćnik za pregled vremena vožnje, pauza i rada. Dizajniran za profesionalne vozače kamiona i autobusa.",
  manifest: "/manifest.webmanifest",
  applicationName: "TachoCommand",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TachoCommand",
  },
  formatDetection: { telephone: false },
  other: { "codex-preview": "development" },
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
