import LegalPage from "../legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage kicker="UZAVŘENÁ BETA" title="Soukromí" updated="Pracovní verze • 18. srpna 2026.">
      <h2>Data během veřejného beta demo období</h2>
      <p>TachoCommand nastavuje technický, HttpOnly soubor cookie, aby server mohl podepsat začátek třídenního demo období. Cookie neobsahuje jméno, e-mail, číslo karty řidiče, registrační značku ani polohu.</p>
      <h2>Data aplikace</h2>
      <p>Ručně zadané aktivity a časy se ukládají lokálně v telefonu. Report kompatibility se do schránky zkopíruje pouze na výslovný požadavek uživatele a neodesílá se automaticky.</p>
      <h2>Bluetooth</h2>
      <p>Prohlížeč zobrazuje svůj vlastní nativní výběr zařízení. TachoCommand neskenuje zařízení na pozadí a nenavazuje spojení bez vědomého stisknutí tlačítka uživatelem.</p>
      <h2>Před komerčním spuštěním</h2>
      <p>Tento dokument bude doplněn o identitu správce údajů, kontaktní informace, právní základy zpracování, doby uchovávání a práva subjektů údajů před zahájením prodeje.</p>
    </LegalPage>
  );
}
