"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeLab } from "@/app/actions";
import type { Reward } from "@/lib/game";
import { BlockText, CodeBlock } from "../BlockText";
import { EvaluationFlow } from "../claude/EvaluationFlow";
import { ErrorText, RewardBanner } from "../RewardBanner";
import { RichText } from "../RichText";
import { PROOF_COMMIT_OR_HOURS } from "@/lib/rules";
import { btnGhost, btnPrimary } from "../ui";
import { LabSpecView, type LabSpecData } from "./LabSpecView";

export type LabPayload = {
  goal?: string;
  /** El ejercicio como requerimiento de trabajo: requisitos, entradas, salidas, reglas, ejemplos. */
  spec?: LabSpecData;
  steps?: { title: string; body?: string; commands?: string[] }[];
  expected?: string;
  checklist?: string[];
  hints?: string[];
  evidence_hint?: string;
  /** "commit_or_hours": solo se entrega con el enlace a un commit o con minutos anotados. */
  proof?: string;
};

export type LabResource = { title: string; url: string | null; howToFind: string | null };

/** Lab (v1): pasos + comandos PowerShell + checklist + evidencia (self-attest). */
export function LabQuest({
  slug,
  payload,
  completed,
  savedEvidence,
  resources = [],
}: {
  slug: string;
  payload: LabPayload;
  completed: boolean;
  savedEvidence: string;
  resources?: LabResource[];
}) {
  const needsProof = payload.proof === PROOF_COMMIT_OR_HOURS;
  const [minutes, setMinutes] = useState("");
  const router = useRouter();
  const checklist = payload.checklist ?? [];
  const hints = payload.hints ?? [];
  const [checked, setChecked] = useState<boolean[]>(() => checklist.map(() => completed));
  const [evidence, setEvidence] = useState(savedEvidence);
  const [hintsShown, setHintsShown] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const allChecked = checked.every(Boolean);

  const submit = () =>
    start(async () => {
      const r = await completeLab({
        questSlug: slug,
        checked: checked.filter(Boolean).length,
        evidence,
        hintsUsed: hintsShown,
        minutes: needsProof ? Number(minutes || 0) : undefined,
      });
      if (!r.ok) return setError(r.error);
      setError(null);
      setReward(r.reward);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      {payload.goal && (
        <p className="rounded-md border-l-2 border-available bg-surface p-3 leading-relaxed">
          <span className="font-mono text-xs text-available">objetivo › </span>
          <RichText text={payload.goal} />
        </p>
      )}

      {resources.length > 0 && (
        <div className="rounded-md border border-line bg-surface p-3 text-sm">
          <p className="font-mono text-xs text-dim">documentación oficial</p>
          <ul className="mt-1 space-y-1">
            {resources.map((r) => (
              <li key={r.title}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-available underline decoration-dotted">
                    {r.title}
                  </a>
                ) : (
                  <span>
                    {r.title} <span className="text-dim">({r.howToFind})</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {payload.spec && <LabSpecView spec={payload.spec} />}

      {payload.spec && (payload.steps ?? []).length > 0 && <h2 className="text-lg font-semibold">Cómo abordarlo</h2>}

      <ol className="space-y-4">
        {(payload.steps ?? []).map((s, i) => (
          <li key={i} className="rounded-md border border-line bg-surface p-4">
            <p className="font-mono text-xs text-dim">paso {i + 1}</p>
            <h3 className="font-semibold">{s.title}</h3>
            {s.body && (
              <div className="mt-1 text-sm leading-relaxed text-ink/90">
                <BlockText text={s.body} />
              </div>
            )}
            {s.commands?.map((c, k) => (
              <CodeBlock key={k} lang="PowerShell" code={c} />
            ))}
          </li>
        ))}
      </ol>

      {payload.expected && (
        <div className="rounded-md border border-line bg-surface p-3 text-sm">
          <p className="font-mono text-xs text-dim">resultado esperado</p>
          <p className="mt-1 whitespace-pre-line">
            <RichText text={payload.expected} />
          </p>
        </div>
      )}

      {hints.length > 0 && !completed && (
        <div className="space-y-2">
          {hints.slice(0, hintsShown).map((h, i) => (
            <p key={i} className="rounded bg-surface-2 p-2 text-sm text-warn">
              Pista {i + 1}: <RichText text={h} />
            </p>
          ))}
          {hintsShown < hints.length && (
            <button className="font-mono text-xs text-dim underline decoration-dotted hover:text-warn" onClick={() => setHintsShown((n) => n + 1)}>
              ver pista {hintsShown + 1}/{hints.length} (−20 % XP)
            </button>
          )}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">Checklist</h2>
        <ul className="mt-2 space-y-1.5">
          {checklist.map((c, i) => (
            <li key={i}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--na-done)]"
                  checked={checked[i]}
                  disabled={completed}
                  onChange={(e) => setChecked((arr) => arr.map((v, k) => (k === i ? e.target.checked : v)))}
                />
                <span>
                  <RichText text={c} />
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{needsProof ? "Entrega: commit u horas" : "Evidencia"}</h2>
        <p className="mt-1 text-sm text-dim">
          {needsProof
            ? "Este ejercicio solo se marca hecho con el enlace a tu commit (…/commit/<hash>) o con los minutos que trabajaste. El commit da los puntos del ejercicio; los minutos dan 10 puntos por cada 30."
            : `${payload.evidence_hint ?? "Pega la salida de tus comandos o la URL de tu commit/repo."} Opcional: pide a Claude que la revise (no bloquea tu avance).`}
        </p>
        {needsProof && !completed && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-mono text-xs text-dim">minutos trabajados</span>
            <input
              type="number"
              min={0}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              className="w-24 rounded border border-line bg-surface p-2 font-mono text-sm"
            />
          </label>
        )}
        <textarea
          rows={needsProof ? 2 : 6}
          value={evidence}
          disabled={completed}
          onChange={(e) => setEvidence(e.target.value)}
          className="mt-2 w-full rounded-md border border-line bg-surface p-3 font-mono text-xs"
          placeholder={needsProof ? "https://github.com/usuario/repo/commit/abc1234" : "PS> ..."}
        />
      </section>

      {evidence.trim().length >= 20 && (
        <details className="rounded-md border border-line bg-surface p-3">
          <summary className="cursor-pointer font-mono text-xs text-available">revisión de evidencia por Claude (opcional)</summary>
          <div className="mt-3">
            <EvaluationFlow kind="lab_review" questSlug={slug} answer={evidence} />
          </div>
        </details>
      )}

      <RewardBanner reward={reward} />
      {completed && !reward ? (
        <p className="text-sm text-done">✓ Lab completado.</p>
      ) : (
        !reward && (
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={pending || !allChecked} onClick={submit}>
              Entregar lab
            </button>
            {!allChecked && <span className={`${btnGhost} pointer-events-none`}>marca todo el checklist</span>}
          </div>
        )
      )}
      <ErrorText error={error} />
    </div>
  );
}
