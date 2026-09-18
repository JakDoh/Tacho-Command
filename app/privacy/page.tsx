import LegalPage from "../legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage kicker="CLOSED BETA" title="Privatnost" updated="Radna verzija • 18. septembar 2026.">
      <h2>Demo pristup</h2>
      <p>TachoCommand postavlja tehnički, HttpOnly kolačić da bi server potpisao početak trodnevnog demo perioda. Kolačić ne sadrži ime, e-mail, broj kartice vozača, registraciju ili lokaciju.</p>

      <h2>Minimalna product analytics</h2>
      <p>Radi razumevanja korišćenja proizvoda beležimo ograničene anonimne događaje kao što su otvaranje landinga ili aplikacije, pokretanje demo pristupa, klik na vodič i izbor jezika. Analitika čuva samo nasumični identifikator sesije, vrstu događaja, površinu proizvoda, jezik, grubu kategoriju izvora posete i vreme prijema na serveru.</p>
      <p>U ovu product analytics evidenciju ne upisujemo ime vozača, broj kartice, registraciju, GPS lokaciju, naziv Bluetooth uređaja, raw tahografske podatke, pun URL, query parametre, IP adresu ili user-agent. Nasumični identifikator je vezan za browser sesiju, a analytics događaji se čuvaju najviše 90 dana.</p>

      <h2>Tehnička telemetrija</h2>
      <p>Tokom očitavanja aplikacija može automatski poslati ograničene tehničke događaje potrebne za dijagnostiku: fazu, ishod, podržani DID, trajanje, NRC, porodicu uređaja, tehnički error code i support code pokušaja. Ova telemetrija ne sadrži identitet vozača, broj kartice, registraciju, lokaciju, pune Bluetooth nazive, raw byte sadržaj niti stvarne vrednosti sa tahografa. Tehnička telemetrija se čuva najviše 60 dana.</p>

      <h2>Podaci kartice i aplikacije</h2>
      <p>Očitani podaci kartice namenjeni prikazu u TachoCommand-u obrađuju se za funkcije aplikacije. Lični raw .ddd field fixture ne objavljujemo u javnom repozitorijumu. Lokalni snapshot poslednjeg uspešnog očitavanja, kada je funkcija dostupna, čuva se u pregledaču na uređaju.</p>

      <h2>Bluetooth</h2>
      <p>Pregledač prikazuje svoj izbor uređaja. TachoCommand ne uspostavlja Bluetooth vezu bez jasne radnje korisnika.</p>

      <h2>Pre komercijalnog lansiranja</h2>
      <p>Ovaj dokument biće dopunjen identitetom rukovaoca podacima, kontaktom, pravnim osnovima, svim obaveznim informacijama o obradi i pravima korisnika pre početka prodaje.</p>
    </LegalPage>
  );
}
