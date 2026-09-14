import ReadOnlyFieldTestClient from "./read-only-field-test-client";

export const metadata = {
  title: "TachoCommand — Core Read-Only Field Test",
  description: "Minimal Smart Tacho V2 read-only RDBI field candidate",
};

export default function FieldTestPage() {
  return <ReadOnlyFieldTestClient />;
}
