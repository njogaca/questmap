"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio", match: ["/"] },
  { href: "/mapa", label: "Mapa", match: ["/mapa", "/zone", "/level", "/quest"] },
  { href: "/arena", label: "Arena", match: ["/arena"] },
  { href: "/glosario", label: "Glosario", match: ["/glosario"] },
  { href: "/ajustes", label: "Ajustes", match: ["/ajustes"] },
];

/** Enlaces de la barra HUD con la sección activa marcada entre corchetes. */
export function NavLinks() {
  const path = usePathname();
  return (
    <ul className="flex gap-1 font-mono text-xs sm:text-sm">
      {LINKS.map((l, i) => {
        const active = l.match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`block px-2 py-1 uppercase tracking-wider transition-colors ${active ? "text-available" : "text-dim hover:text-ink"}`}
            >
              <span className="ui-hud">{active ? `[${l.label}]` : l.label}</span>
              <span className="ui-term normal-case tracking-normal">
                {i}:{l.label.toLowerCase()}
                {active ? "*" : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
