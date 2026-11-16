import type { ReactNode } from "react";
import { CodeBlock } from "../BlockText";
import { RichText } from "../RichText";

/** Forma de `payload.spec`; la valida `labSpecSchema` en `src/content/schema.ts`. */
export type LabSpecData = {
  context?: string;
  requirements?: string[];
  inputs?: SpecField[];
  outputs?: SpecField[];
  rules?: string[];
  examples?: { title: string; input?: string; output: string; lang?: string }[];
  edge_cases?: string[];
  out_of_scope?: string[];
};
type SpecField = { name: string; type: string; desc: string };

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <p className="font-mono text-xs text-dim">{label}</p>
      <div className="mt-2 text-sm leading-relaxed text-ink/90">{children}</div>
    </div>
  );
}

/** Lista numerada con prefijo (RF-1, RN-1…) para poder citar cada punto en un commit o una prueba. */
function Numbered({ prefix, items }: { prefix: string; items: string[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 font-mono text-xs leading-relaxed text-available">
            {prefix}-{i + 1}
          </span>
          <span>
            <RichText text={t} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Fields({ rows }: { rows: SpecField[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line font-mono text-xs text-dim">
            <th className="py-1 pr-4 font-normal">nombre</th>
            <th className="py-1 pr-4 font-normal">tipo</th>
            <th className="py-1 font-normal">qué es</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line/50 align-top last:border-0">
              <td className="py-1.5 pr-4 font-mono text-xs text-ink">{r.name}</td>
              <td className="py-1.5 pr-4 font-mono text-xs whitespace-nowrap text-available">{r.type}</td>
              <td className="py-1.5">
                <RichText text={r.desc} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((t, i) => (
        <li key={i}>
          <RichText text={t} />
        </li>
      ))}
    </ul>
  );
}

/** El ejercicio como requerimiento: contexto, requisitos, datos, reglas, ejemplos y límites. */
export function LabSpecView({ spec }: { spec: LabSpecData }) {
  const { requirements = [], inputs = [], outputs = [], rules = [], examples = [], edge_cases = [], out_of_scope = [] } = spec;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Requerimiento</h2>

      {spec.context && (
        <Block label="contexto">
          <p className="whitespace-pre-line">
            <RichText text={spec.context.trim()} />
          </p>
        </Block>
      )}

      {requirements.length > 0 && (
        <Block label="requisitos funcionales">
          <Numbered prefix="RF" items={requirements} />
        </Block>
      )}

      {inputs.length > 0 && (
        <Block label="entradas">
          <Fields rows={inputs} />
        </Block>
      )}

      {outputs.length > 0 && (
        <Block label="salidas">
          <Fields rows={outputs} />
        </Block>
      )}

      {rules.length > 0 && (
        <Block label="reglas de negocio">
          <Numbered prefix="RN" items={rules} />
        </Block>
      )}

      {examples.length > 0 && (
        <Block label="ejemplos">
          <div className="space-y-4">
            {examples.map((e, i) => (
              <div key={i}>
                <p className="font-semibold text-ink">
                  <RichText text={e.title} />
                </p>
                {e.input && <CodeBlock lang="entrada" code={e.input.replace(/\n$/, "")} />}
                <CodeBlock lang={e.lang ?? "salida esperada"} code={e.output.replace(/\n$/, "")} />
              </div>
            ))}
          </div>
        </Block>
      )}

      {edge_cases.length > 0 && (
        <Block label="casos límite">
          <Bullets items={edge_cases} />
        </Block>
      )}

      {out_of_scope.length > 0 && (
        <Block label="fuera de alcance">
          <Bullets items={out_of_scope} />
        </Block>
      )}
    </section>
  );
}
