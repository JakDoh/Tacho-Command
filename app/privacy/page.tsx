import LegalPage from "../legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage kicker="CLOSED BETA" title="Privatnost" updated="Radna verzija • 18. avgust 2026.">
      <h2>Podaci tokom javnog beta-demo perioda</h2>
      <p>TachoCommand postavlja tehnički, HttpOnly kolačić da bi server potpisao početak trodnevnog demo perioda. Kolačić ne sadrži ime, e-mail, broj kartice vozača, registraciju ili lokaciju.</p>
      <h2>Podaci aplikacije</h2>
      <p>Ručne aktivnosti i vremena čuvaju se lokalno na telefonu. Compatibility report se kopira u clipboard tek na zahtev korisnika i ne šalje se automatski.</p>
      <h2>Bluetooth</h2>
      <p>Pregledač prikazuje svoj izbor uređaja. TachoCommand ne skenira uređaje u pozadini i ne uspostavlja vezu bez jasnog pritiska korisnika.</p>
      <h2>Pre komercijalnog lansiranja</h2>
      <p>Ovaj dokument biće dopunjen identitetom rukovaoca podacima, kontaktom, pravnim osnovima, rokovima čuvanja i pravima korisnika pre početka prodaje.</p>
    </LegalPage>
  );
}
