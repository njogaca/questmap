"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCustomResource, completeLearn, setResourceSeen } from "@/app/actions";
import type { Reward } from "@/lib/game";
import { LEARN_NOTE_MIN_CHARS } from "@/lib/rules";
import { ErrorText, RewardBanner } from "../RewardBanner";
import { btnGhost, btnPrimary } from "../ui";

export type LearnResource = {
  id: number;
  title: string;
  type: string;
  url: string | null;
  howToFind: string | null;
  language: string;
  durationMin: number | null;
  cost: string;
  why: string | null;
  verified: boolean;
  required: boolean;
  seen: boolean;
};
export type CustomRes = { id: number; title: string; url: string | null; type: string; notes: string | null };

const COST: Record<string, string> = { free: "gratis", paid: "de pago", included: "ya lo tienes" };

export function LearnQuest({
  slug,
  resources,
  custom,
  notePrompt,
  savedNote,
  completed,
}: {
  slug: string;
  resources: LearnResource[];
  custom: CustomRes[];
  notePrompt: string;
  savedNote: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState(savedNote);
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (r: LearnResource) =>
    start(async () => {
      const res = await setResourceSeen(slug, r.id, !r.seen);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });

  const submit = () =>
    start(async () => {
      const res = await completeLearn(slug, note);
      if (!res.ok) return setError(res.error);
      setError(null);
      setReward(res.reward);
      router.refresh();
    });

  const requiredPending = resources.filter((r) => r.required && !r.seen).length;
  const noteLen = note.trim().length;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold">Recursos</h2>
        <ul className="mt-2 space-y-2">
          {resources.map((r) => (
            <li key={r.id} className="rounded-md border border-line bg-surface p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--na-done)]"
                  checked={r.seen}
                  disabled={pending}
                  onChange={() => toggle(r)}
                  aria-label={`Marcar "${r.title}" como visto`}
                />
                <div className="min-w-0 flex-1">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-available hover:underline">
                      {r.title} ↗
                    </a>
                  ) : (
                    <span>{r.title}</span>
                  )}
                  <p className="mt-0.5 font-mono text-xs text-dim">
                    {r.type} · {r.language.toUpperCase()} · {COST[r.cost] ?? r.cost}
                    {r.durationMin ? ` · ~${r.durationMin} min` : ""}
                    {r.required ? " · obligatorio" : " · opcional"}
                    {r.url && !r.verified ? " · sin verificar" : ""}
                  </p>
                  {r.why && <p className="mt-1 text-sm text-dim">{r.why}</p>}
                  {!r.url && r.howToFind && <p className="mt-1 text-sm text-warn">Cómo encontrarlo: {r.howToFind}</p>}
                </div>
              </div>
            </li>
          ))}
          {custom.map((c) => (
            <li key={`c${c.id}`} className="rounded-md border border-dashed border-line bg-surface p-3 text-sm">
              <span className="font-mono text-xs text-warn">tuyo · </span>
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer" className="text-available hover:underline">
                  {c.title} ↗
                </a>
              ) : (
                c.title
              )}
              {c.notes && <p className="mt-1 text-dim">{c.notes}</p>}
            </li>
          ))}
        </ul>
        <AddResource slug={slug} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Tu nota</h2>
        <p className="mt-1 text-sm text-dim">{notePrompt}</p>
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-2 w-full rounded-md border border-line bg-surface p-3 text-sm leading-relaxed"
          placeholder="Con tus palabras, en español o inglés…"
        />
        <p className={`font-mono text-xs ${noteLen >= LEARN_NOTE_MIN_CHARS ? "text-done" : "text-dim"}`}>
          {noteLen}/{LEARN_NOTE_MIN_CHARS} caracteres mínimos
        </p>
      </section>

      {reward && <RewardBanner reward={reward} />}
      {completed && !reward ? (
        <p className="text-sm text-done">✓ Quest completada. Puedes seguir editando tus recursos.</p>
      ) : (
        !reward && (
          <div className="space-y-2">
            {requiredPending > 0 && (
              <p className="text-sm text-dim">Te faltan {requiredPending} recurso(s) obligatorio(s) por marcar como vistos.</p>
            )}
            <button className={btnPrimary} disabled={pending || requiredPending > 0 || noteLen < LEARN_NOTE_MIN_CHARS} onClick={submit}>
              Completar quest
            </button>
          </div>
        )
      )}
      <ErrorText error={error} />
    </div>
  );
}

function AddResource({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button className={`${btnGhost} mt-2`} onClick={() => setOpen(true)}>
        + agregar un recurso propio
      </button>
    );
  return (
    <form
      className="mt-3 grid gap-2 rounded-md border border-line bg-surface p-3 text-sm sm:grid-cols-2"
      action={(fd) =>
        start(async () => {
          const r = await addCustomResource({
            title: String(fd.get("title") ?? ""),
            url: String(fd.get("url") ?? ""),
            type: String(fd.get("type") ?? "article"),
            language: String(fd.get("language") ?? "es"),
            durationMin: Number(fd.get("duration")) || undefined,
            notes: String(fd.get("notes") ?? ""),
            questSlug: slug,
          });
          if (!r.ok) return setError(r.error);
          setOpen(false);
          router.refresh();
        })
      }
    >
      <input name="title" required placeholder="Título (ej. curso de Udemy, sección 3)" className="rounded border border-line bg-bg p-2 sm:col-span-2" />
      <input name="url" placeholder="https://… (opcional)" className="rounded border border-line bg-bg p-2 sm:col-span-2" />
      <select name="type" className="rounded border border-line bg-bg p-2">
        {["course", "video", "article", "docs", "book", "channel", "lab"].map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <select name="language" className="rounded border border-line bg-bg p-2">
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
      <input name="duration" type="number" min={1} placeholder="Minutos" className="rounded border border-line bg-bg p-2" />
      <input name="notes" placeholder="Nota (opcional)" className="rounded border border-line bg-bg p-2" />
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnPrimary} disabled={pending}>
          Guardar
        </button>
        <button type="button" className={btnGhost} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
      <div className="sm:col-span-2">
        <ErrorText error={error} />
      </div>
    </form>
  );
}
