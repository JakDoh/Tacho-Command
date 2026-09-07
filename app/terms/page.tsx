import LegalPage from "../legal-page";

export default function TermsPage() {
  return (
    <LegalPage kicker="UZAVŘENÁ BETA" title="Podmínky beta používání" updated="Pracovní verze • 18. srpna 2026.">
      <h2>Pomocný nástroj</h2>
      <p>TachoCommand je během bety pomocný, experimentální zobrazovací nástroj. Tachograf, karta řidiče, oficiální záznamy a platné právní předpisy zůstávají vždy závazné.</p>
      <h2>Bezpečné používání</h2>
      <p>Bluetooth párování, nastavení a sledování telefonu se provádí pouze tehdy, když vozidlo bezpečně stojí. Aplikace se nesmí ovládat během jízdy.</p>
      <h2>Třídenní demo</h2>
      <p>Demo trvá 72 hodin od prvního úspěšného spuštění, nevyžaduje platební kartu a automaticky se nepřevádí na placené předplatné.</p>
      <h2>Beta přístup</h2>
      <p>Funkce se mohou měnit na základě výsledků z terénního testování. Nákup licence zatím není k dispozici a žádná cena na webu v současnosti nepředstavuje aktivní nabídku k uzavření smlouvy.</p>
    </LegalPage>
  );
}
