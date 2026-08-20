import FieldTestClient from "./field-test-client";

export const metadata = {
  title: "TachoCommand 0.16 — RHMI Field Test",
  description: "Smart Tacho V2 Remote HMI F211 field test",
};

export default function FieldTestPage() {
  return <FieldTestClient />;
}
