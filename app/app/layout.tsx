import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Driver App",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DriverAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
