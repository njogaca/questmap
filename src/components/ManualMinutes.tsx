"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addManualMinutes } from "@/app/actions";
import { btnGhost } from "./ui";

export function ManualMinutes() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <button className={`${btnGhost} w-full`} onClick={() => setOpen(true)}>
        + registrar minutos a mano
      </button>
    );

  return (
    <form
      className="flex flex-wrap gap-2"
      action={(fd) =>
        start(async () => {
          const r = await addManualMinutes(Number(fd.get("minutes")), String(fd.get("activity") ?? ""));
          if (!r.ok) return setMsg(r.error);
          setMsg(r.badges.length ? `Guardado. Insignia: ${r.badges.join(", ")}` : "Guardado.");
          setOpen(false);
          router.refresh();
        })
      }
    >
      <input name="minutes" type="number" min={1} max={600} required placeholder="min" className="w-20 rounded border border-line bg-bg p-2 text-sm" />
      <input name="activity" placeholder="¿Qué estudiaste?" className="min-w-0 flex-1 rounded border border-line bg-bg p-2 text-sm" />
      <button className={btnGhost} disabled={pending}>
        Guardar
      </button>
      {msg && <p className="w-full text-xs text-dim">{msg}</p>}
    </form>
  );
}
