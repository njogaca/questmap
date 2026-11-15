import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="hud-panel hud-panel-progress p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-progress">error 404 · acceso denegado</p>
        <h1 className="mt-3 text-3xl font-bold">Nodo no encontrado</h1>
        <p className="mt-2 font-mono text-sm text-dim">&gt; la ruta solicitada no existe en el atlas_</p>
        <Link href="/mapa" className={`${btnPrimary} mt-6`}>
          &gt; volver al mapa
        </Link>
      </div>
    </main>
  );
}
