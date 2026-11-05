"use client";

import { useMemo, useState } from "react";
import { RichText } from "./RichText";

export type GlossaryRow = {
  id: number;
  term: string;
  zoneSlug: string | null;
  zoneTitle: string | null;
  category: string | null;
  definitionEs: string;
  definitionEn: string;
  exampleEn: string | null;
  analogy: string | null;
  analogyMq: string | null;
  seeAlso: string[];
  /** null = nunca estudiado */
  nextReview: string | null;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function GlossaryBrowser({ rows }: { rows: GlossaryRow[] }) {
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("");
  const [cat, setCat] = useState("");
  const [onlyAnalogy, setOnlyAnalogy] = useState(false);

  const zones = useMemo(
    () => [...new Map(rows.filter((r) => r.zoneSlug).map((r) => [r.zoneSlug!, r.zoneTitle ?? r.zoneSlug!])).entries()],
    [rows],
  );
  const cats = useMemo(() => [...new Set(rows.map((r) => r.category).filter(Boolean))] as string[], [rows]);

  const filtered = rows.filter((r) => {
    if (zone && r.zoneSlug !== zone) return false;
    if (cat && r.category !== cat) return false;
    if (onlyAnalogy && !r.analogy && !r.analogyMq) return false;
    if (!q) return true;
    const hay = norm(`${r.term} ${r.definitionEs} ${r.definitionEn} ${r.analogy ?? ""} ${r.analogyMq ?? ""}`);
    return hay.includes(norm(q));
  });

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar término o definición…"
          className="rounded-md border border-line bg-surface p-2.5 text-sm"
          aria-label="Buscar en el glosario"
        />
        <select value={zone} onChange={(e) => setZone(e.target.value)} className="rounded-md border border-line bg-surface p-2.5 text-sm" aria-label="Filtrar por zona">
          <option value="">Todas las zonas</option>
          {zones.map(([slug, title]) => (
            <option key={slug} value={slug}>
              {title}
            </option>
          ))}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-md border border-line bg-surface p-2.5 text-sm" aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm text-dim">
        <input type="checkbox" checked={onlyAnalogy} onChange={(e) => setOnlyAnalogy(e.target.checked)} className="accent-[var(--na-warn)]" />
        Solo términos con analogía
      </label>

      <p className="mt-3 font-mono text-xs text-dim">{filtered.length} términos</p>
      <ul className="mt-2 space-y-2">
        {filtered.map((r) => (
          <li key={r.id} className="rounded-md border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-lg text-available">{r.term}</p>
              <p className="font-mono text-xs text-dim">
                {[r.zoneTitle, r.category].filter(Boolean).join(" · ")}
                {" · "}
                {r.nextReview ? `próximo repaso ${new Date(r.nextReview).toLocaleDateString("es")}` : "nuevo"}
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed"><RichText text={r.definitionEs} /></p>
            <p className="mt-1 text-sm text-dim">
              <span className="font-mono text-xs">EN · </span>
              {r.definitionEn}
            </p>
            {r.exampleEn && <p className="mt-2 border-l-2 border-available pl-3 text-sm italic">&ldquo;{r.exampleEn}&rdquo;</p>}
            {r.analogy && (
              <p className="mt-2 rounded bg-surface-2 p-2 text-xs">
                <span className="font-mono text-warn">Analogía › </span>
                {r.analogy}
              </p>
            )}
            {r.analogyMq && (
              <p className="mt-2 rounded bg-surface-2 p-2 text-xs">
                <span className="font-mono text-dim">En MQ/IIB › </span>
                {r.analogyMq}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
