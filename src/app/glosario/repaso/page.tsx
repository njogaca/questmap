import Link from "next/link";
import { ReviewSession } from "@/components/ReviewSession";
import { dueCards, newCards } from "@/lib/glossary";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [due, fresh] = await Promise.all([dueCards(30), newCards(10)]);
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link href="/glosario" className="font-mono text-xs text-dim hover:text-available">
        &lt; glosario
      </Link>
      <p className="mt-4 font-mono text-xs text-available">&gt; repaso espaciado</p>
      <h1 className="mt-1 text-2xl font-bold">Flashcards</h1>
      <div className="mt-5">
        <ReviewSession due={due} fresh={fresh} />
      </div>
    </main>
  );
}
