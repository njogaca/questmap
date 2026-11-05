import Link from "next/link";

const LINKS = [
  { href: "/", label: "Mapa" },
  { href: "/sistema", label: "Sistema" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-title text-xl font-bold tracking-wider">
          QUEST<span className="text-available">MAP</span>
        </Link>
        <ul className="flex gap-4 font-mono text-sm">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-dim transition-colors hover:text-available">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
