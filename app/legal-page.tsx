import Link from "next/link";

export default function LegalPage({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-shell">
      <Link className="landing-brand" href="/">
        <span className="landing-logo">TC</span>
        <strong>Tacho<span>Command</span></strong>
      </Link>
      <article>
        <span className="landing-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p className="legal-updated">{updated}</p>
        {children}
      </article>
      <Link className="legal-back" href="/">← Zpět na úvod</Link>
    </main>
  );
}
