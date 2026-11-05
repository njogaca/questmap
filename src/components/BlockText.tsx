"use client";

import { useState } from "react";
import { RichText } from "./RichText";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="font-mono text-[11px] text-dim hover:text-available"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        })
      }
    >
      {done ? "copiado ✓" : "copiar"}
    </button>
  );
}

export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="mt-2 rounded border border-line bg-bg">
      <div className="flex justify-between border-b border-line px-3 py-1">
        <span className="font-mono text-[11px] text-dim">{lang || "texto"}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-done">{code}</pre>
    </div>
  );
}

/** Texto con bloques ```lang … ``` (código con sangría y copiar) y `código` en línea. */
export function BlockText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    const before = text.slice(last, m.index).trim();
    if (before)
      parts.push(
        <p key={i++} className="whitespace-pre-line">
          <RichText text={before} />
        </p>,
      );
    parts.push(<CodeBlock key={i++} lang={m[1]} code={m[2].replace(/\n$/, "")} />);
    last = re.lastIndex;
  }
  const rest = text.slice(last).trim();
  if (rest)
    parts.push(
      <p key={i++} className="whitespace-pre-line">
        <RichText text={rest} />
      </p>,
    );
  return <div className="space-y-2">{parts}</div>;
}
