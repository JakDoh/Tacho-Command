import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Status projekta i podaci koji će biti kompletirani pre komercijalnog lansiranja TachoCommand-a.",
  alternates: { canonical: "/impressum" },
};

export default function ImpressumPage() {
  return (
    <LegalPage kicker="CLOSED BETA" title="Impressum" updated="Podaci za komercijalni launch još nisu objavljeni.">
      <h2>Status projekta</h2>
      <p>TachoCommand je zatvoreni beta-projekat bez aktivne prodaje. Potpuni podaci pružaoca, poslovni kontakt i eventualni registracioni podaci biće objavljeni i provereni pre otvaranja plaćene licence.</p>
      <h2>Važna napomena</h2>
      <p>Ova stranica nije zamena za obavezni potpuni Impressum. Komercijalni checkout i oglašavanje ostaju zaključani dok pravni podaci ne budu kompletirani.</p>
    </LegalPage>
  );
}

