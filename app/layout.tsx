import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";

export const metadata: Metadata = {
  title: "TachoCommand — tvůj řidičský cockpit",
  description:
    "Mobilní pomocník pro profesionální řidiče autobusů a kamionů. Přehled řízení, přestávek, směn a Smart Tacho 2 beta propojení.",
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
    <html lang="cs">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
