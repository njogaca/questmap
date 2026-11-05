import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="font-mono text-sm text-progress">error 404 · nodo no encontrado</p>
      <h1 className="mt-2 text-3xl font-bold">Este sector no existe</h1>
      <Link href="/mapa" className="mt-6 inline-block font-mono text-sm text-available hover:underline">
        &gt; volver al mapa
      </Link>
    </main>
  );
}
