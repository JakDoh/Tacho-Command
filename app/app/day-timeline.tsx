"use client";
import { useState } from "react";
import type { FieldProvenHistoryDay } from "../../lib/field-proven-product-state.js";
import type { AppLocale } from "../../lib/product-app-copy.js";
import styles from "./field-proven-premium-ui.module.css";

const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const zoomLabel = {sr: "Zum", en: "Zoom", de: "Zoom", ru: "Масштаб", bg: "Мащаб", ro: "Zoom", hu: "Nagyítás"};
export default function DayTimeline({ day, kinds, locale }: {
  day: FieldProvenHistoryDay;
  kinds: Record<string, string>;
  locale: AppLocale;
}) {
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const segment = selected === null ? null : day.segments[selected];
  const step = zoom >= 4 ? 15 : 60;
  const span = day.timelineMinutes ?? 1440;
  const ticks = day.timelineTicks?.length ? day.timelineTicks : Array.from({length: 97}, (_, i) => ({minute: i * 15, label: clock(i * 15)}));
  return <section className={styles.dayTimelinePanel}>
    <div className={styles.timelineControls}>
      <span>{zoomLabel[locale]} · {zoom}×</span>
      <button type="button" disabled={zoom === 1} aria-label={`${zoomLabel[locale]} −`} onClick={() => setZoom(zoom / 2)}>−</button>
      <button type="button" disabled={zoom === 8} aria-label={`${zoomLabel[locale]} +`} onClick={() => setZoom(zoom * 2)}>+</button>
    </div>
    <div className={styles.timelineScroll}>
      <div className={styles.timelineCanvas} style={{width: `${zoom * 100}%`}}>
        <div className={styles.timelineRuler} aria-hidden="true">
          {ticks.filter(tick => tick.minute % step === 0).map(tick =>
            <span key={tick.minute} style={{left: `${tick.minute / span * 100}%`}}>
              {tick.minute % 60 === 0 && (zoom > 1 || tick.minute % 120 === 0) ? tick.label : ""}
            </span>)}
        </div>
        <div className={styles.dayTimelineTrack}>
          {day.segments.map((seg, i) => seg.startMinute !== null && seg.endMinute !== null ?
            <button type="button" key={i} className={`${styles.timelineSegment} ${styles[seg.kind]}`}
              style={{left: `${(seg.timelineStart ?? seg.startMinute) / span * 100}%`, width: `${((seg.timelineEnd ?? seg.endMinute) - (seg.timelineStart ?? seg.startMinute)) / span * 100}%`}}
              title={`${kinds[seg.kind]} ${seg.timeLabel ?? `${clock(seg.startMinute)}–${clock(seg.endMinute)}`} · ${seg.minutes} min`}
              aria-label={`${kinds[seg.kind]} ${seg.timeLabel ?? `${clock(seg.startMinute)}–${clock(seg.endMinute)}`} · ${seg.minutes} min`}
              aria-pressed={selected === i} onClick={() => setSelected(i)} /> : null)}
        </div>
      </div>
    </div>
    <div className={styles.timelineLegend}>
      {Object.entries(kinds).map(([kind, label]) => <span key={kind}><i className={styles[kind]} />{label}</span>)}
    </div>
    {segment && segment.startMinute !== null && segment.endMinute !== null &&
      <p aria-live="polite">{kinds[segment.kind]} · {segment.timeLabel ?? `${clock(segment.startMinute)}–${clock(segment.endMinute)}`} · {segment.minutes} min</p>}
  </section>;
}
