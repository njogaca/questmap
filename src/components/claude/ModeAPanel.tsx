"use client";

import { useState } from "react";
import { btnGhost, btnPrimary } from "../ui";

/** Modo A: copiar el prompt, pegarlo en claude.ai y pegar aquí la respuesta. */
export function ModeAPanel({
  prompt,
  onSubmit,
  pending,
  title = "Modo A — sin API (costo $0)",
  pasteLabel = "Pega aquí la respuesta COMPLETA de Claude (con el bloque JSON del final):",
}: {
  prompt: string;
  onSubmit: (pasted: string) => void;
  pending?: boolean;
  title?: string;
  pasteLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-3 rounded-md border border-line bg-surface p-4">
      <p className="font-mono text-xs text-available">{title}</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-dim">
        <li>Copia el prompt.</li>
        <li>
          Pégalo en un chat nuevo de{" "}
          <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className="text-available hover:underline">
            claude.ai ↗
          </a>
          .
        </li>
        <li>Pega aquí abajo la respuesta de Claude.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            navigator.clipboard?.writeText(prompt).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? "Prompt copiado ✓" : "Copiar prompt para Claude"}
        </button>
        <button type="button" className={btnGhost} onClick={() => setShow((v) => !v)}>
          {show ? "Ocultar prompt" : "Ver prompt"}
        </button>
      </div>
      {show && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-line bg-bg p-3 font-mono text-xs text-dim">
          {prompt}
        </pre>
      )}
      <label className="block text-sm">
        {pasteLabel}
        <textarea
          rows={6}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-bg p-3 font-mono text-xs"
          placeholder="…respuesta de Claude…"
        />
      </label>
      <button type="button" className={btnPrimary} disabled={pending || pasted.trim().length < 20} onClick={() => onSubmit(pasted)}>
        {pending ? "Procesando…" : "Guardar calificación"}
      </button>
    </div>
  );
}
