/** Texto con `código` en línea (backticks) en monoespaciado y **negritas**. Sin HTML. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code key={i} className="rounded bg-surface-2 px-1 py-0.5 text-[0.9em] text-available">
            {p.slice(1, -1)}
          </code>
        ) : (
          <Bold key={i} text={p} />
        ),
      )}
    </>
  );
}

function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
