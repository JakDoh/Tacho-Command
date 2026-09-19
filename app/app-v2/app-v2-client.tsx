"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FieldProvenPremiumUi from "../app/field-proven-premium-ui";
import { createFieldProvenProductState } from "../../lib/field-proven-product-state.js";
import {
  cardStateFromLastGoodCardSnapshot,
  loadLastGoodCardSnapshot,
} from "../../lib/last-good-card-snapshot.js";
import { formatTachoCommandVersionLine } from "../../lib/product-version.js";
import styles from "./app-v2.module.css";

type RestoreState = "checking" | "restored" | "empty" | "invalid";

function formatRestoreTime(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppV2Client() {
  const [restoreState, setRestoreState] = useState<RestoreState>("checking");
  const [cardState, setCardState] = useState<Readonly<Record<string, unknown>> | null>(null);
  const [capturedAtIso, setCapturedAtIso] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const snapshot = loadLastGoodCardSnapshot(window.localStorage);
        if (!snapshot) {
          setRestoreState("empty");
          return;
        }

        const restoredCard = cardStateFromLastGoodCardSnapshot(snapshot);
        if (!restoredCard) {
          setRestoreState("invalid");
          return;
        }

        setCardState(restoredCard);
        setCapturedAtIso(snapshot.capturedAtIso);
        setRestoreState("restored");
      } catch {
        setRestoreState("invalid");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const state = useMemo(() => createFieldProvenProductState({
    live: { connected: false },
    card: cardState ?? {},
    localeLabel: "SR · Srpski",
  }), [cardState]);

  const restoredLabel = formatRestoreTime(capturedAtIso);

  return (
    <div className={styles.stage}>
      <section className={styles.commandDeck} aria-label="TachoCommand App V2 status">
        <div className={styles.deckLead}>
          <span className={styles.eyebrow}>TACHOCOMMAND · APP V2</span>
          <strong>Instrument spreman. Podaci ostaju tvoji.</strong>
          <p>
            Novi app source je odvojen od legacy recovery puta. Poslednje potpuno uspešno
            očitavanje kartice vraća se lokalno pre nove Bluetooth sesije.
          </p>
        </div>

        <div className={styles.deckStatus}>
          <div className={styles.statusOrb} data-state={restoreState} aria-hidden="true" />
          <div>
            <span>LOKALNI SNAPSHOT</span>
            <strong>
              {restoreState === "checking" && "Proveravam…"}
              {restoreState === "restored" && "Poslednje dobro očitavanje vraćeno"}
              {restoreState === "empty" && "Još nema sačuvanog očitavanja"}
              {restoreState === "invalid" && "Sačuvani zapis nije prihvaćen"}
            </strong>
            <small>{restoredLabel ? "Sačuvano " + restoredLabel : "Bez izmišljanja podataka"}</small>
          </div>
        </div>

        <div className={styles.deckActions}>
          <Link href="/field-test" className={styles.primaryAction}>
            Poveži tahograf
          </Link>
          <span className={styles.versionLine}>{formatTachoCommandVersionLine()}</span>
        </div>
      </section>

      <section className={styles.instrumentFrame} aria-label="TachoCommand premium instrument">
        <FieldProvenPremiumUi state={state} />
      </section>

      <aside className={styles.truthStrip}>
        <span>APP V2 CANDIDATE</span>
        <p>
          Golden 0.32c transport nije deo ovog izvora. Ovaj kandidat trenutno integriše
          premium prikaz, product-state adapter, lokalni last-good restore i release identitet.
        </p>
      </aside>
    </div>
  );
}
