import LegalPage from "../legal-page";

export default function TermsPage() {
  return (
    <LegalPage kicker="CLOSED BETA" title="Uslovi beta korišćenja" updated="Radna verzija • 18. avgust 2026.">
      <h2>Pomoćni alat</h2>
      <p>TachoCommand je tokom bete pomoćni, eksperimentalni prikaz. Tahograf, kartica vozača, zvanični zapisi i važeći propisi ostaju merodavni.</p>
      <h2>Bezbedna upotreba</h2>
      <p>Bluetooth povezivanje, podešavanje i pregled telefona obavljaju se samo dok je vozilo bezbedno zaustavljeno. Aplikacija se ne koristi tokom vožnje.</p>
      <h2>Trodnevni demo</h2>
      <p>Demo traje 72 sata od prvog uspešnog pokretanja, ne zahteva platnu karticu i ne pretvara se automatski u naplatu.</p>
      <h2>Beta pristup</h2>
      <p>Funkcije se mogu menjati na osnovu terenskih rezultata. Kupovina još nije dostupna i nijedna cena na sajtu trenutno ne predstavlja aktivnu ponudu za zaključenje ugovora.</p>
    </LegalPage>
  );
}
