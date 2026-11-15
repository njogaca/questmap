"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type PaletteZone = {
  slug: string;
  title: string;
  emoji: string | null;
  order: number;
  locked: boolean;
  percent: number;
};

type Item = { id: string; label: string; hint: string; href: string; keywords: string };

const OPEN_EVENT = "qm-palette-open";

/** Abre la terminal desde cualquier componente cliente. */
export function openPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const PAGES: Item[] = [
  { id: "home", label: "Inicio · Daily Quest", hint: "página", href: "/", keywords: "inicio home dashboard daily quest hoy" },
  { id: "mapa", label: "Mapa del reino", hint: "página", href: "/mapa", keywords: "mapa atlas sectores zonas" },
  { id: "arena", label: "Interview Arena", hint: "página", href: "/arena", keywords: "arena entrevista interview mock loop" },
  { id: "glosario", label: "Glosario", hint: "página", href: "/glosario", keywords: "glosario terminos vocabulario" },
  { id: "repaso", label: "Repasar flashcards de hoy", hint: "acción", href: "/glosario/repaso", keywords: "repaso flashcards tarjetas srs" },
  { id: "ajustes", label: "Ajustes", hint: "página", href: "/ajustes", keywords: "ajustes settings claude respaldo backup efectos" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Terminal de comandos (Ctrl+K o "/"): salta a páginas y sectores escribiendo su nombre.
 * Los sectores bloqueados aparecen cifrados, igual que en el mapa.
 */
export function CommandPalette({ zones }: { zones: PaletteZone[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(
    () => [
      ...PAGES,
      ...zones.map((z) => ({
        id: `zone-${z.slug}`,
        label: z.locked ? `▓▓▓▓▓▓ sector ${pad(z.order)} · datos cifrados` : `${z.emoji ?? ""} ${z.title}`.trim(),
        hint: z.locked ? "bloqueado" : `sector ${pad(z.order)} · ${z.percent} %`,
        href: `/zone/${z.slug}`,
        keywords: z.locked ? `sector ${pad(z.order)} bloqueado cifrado` : `${z.title} ${z.slug} sector ${pad(z.order)}`,
      })),
    ],
    [zones],
  );

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return items.slice(0, 9);
    return items.filter((it) => norm(`${it.label} ${it.keywords}`).includes(n)).slice(0, 9);
  }, [q, items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const go = (it: Item) => {
    setOpen(false);
    router.push(it.href);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm" onClick={() => setOpen(false)} role="presentation">
      <div
        className="hud-panel hud-panel-accent hud-corners mx-auto mt-[12vh] w-[min(92vw,620px)]"
        role="dialog"
        aria-modal="true"
        aria-label="Terminal de comandos"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 font-mono text-sm">
          <span className="shrink-0 text-available">root@questmap:~$</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, Math.max(0, results.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                const it = results[cursor];
                if (it) go(it);
              }
            }}
            placeholder="ir a… (mapa, arena, java, sector 05)"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-dim"
            autoComplete="off"
            spellCheck={false}
            aria-label="Comando"
          />
          <span className="qm-blink text-available" aria-hidden>
            ▮
          </span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox" aria-label="Resultados">
          {results.length === 0 && <li className="px-4 py-3 font-mono text-xs text-dim">sin resultados · comando desconocido</li>}
          {results.map((it, i) => (
            <li key={it.id} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(it)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                  i === cursor ? "bg-available/10 text-available" : "text-ink"
                }`}
              >
                <span className="truncate">
                  <span className="mr-2 inline-block w-3 font-mono text-xs opacity-70">{i === cursor ? "▸" : ""}</span>
                  {it.label}
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-dim">{it.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 font-mono text-[11px] text-dim">↑↓ navegar · ↵ abrir · esc cerrar · ctrl+k o / para abrir</p>
      </div>
    </div>
  );
}

/** Botón discreto del HUD que abre la terminal (para quien no conoce el atajo). */
export function PaletteButton() {
  return (
    <button
      type="button"
      onClick={openPalette}
      className="font-mono text-[11px] uppercase tracking-wider text-dim transition-colors hover:text-available"
      title="Terminal de comandos (Ctrl+K)"
    >
      [ ctrl+k ]
    </button>
  );
}
