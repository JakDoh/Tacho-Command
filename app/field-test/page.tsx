import type { Metadata } from "next";
import ReadOnlyFieldTestClient from "./read-only-field-test-client";

export const metadata: Metadata = {
  title: "Core Read-Only Field Test",
  description: "Minimal Smart Tacho V2 read-only RDBI field candidate",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function FieldTestPage() {
  return <ReadOnlyFieldTestClient />;
}
