import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import { ArcadeField } from "@/components/effects/ArcadeField";
import { MotionRoot } from "@/components/effects/MotionRoot";
import { Hud } from "@/components/hud/Hud";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "QuestMap", template: "%s · QuestMap" },
  description: "Mapa de logros para conseguir el trabajo",
};

export const viewport: Viewport = {
  themeColor: "#060a10",
  width: "device-width",
  initialScale: 1,
};

/**
 * Corre ANTES del primer frame: aplica la paleta y la interfaz elegidas (para que no parpadee la predeterminada) y
 * decide si toca la pantalla de arranque (una vez al día y solo con animaciones activas).
 * Lee las mismas claves de localStorage que src/components/effects/prefs.ts.
 */
const BOOT_SCRIPT = `(function(){var d=document.documentElement.dataset;try{var p=JSON.parse(localStorage.getItem("qm.effects")||"{}");var T={hud:"ctos",terminal:"fsociety",retro:"frostpunk",animus:"animus"};var u=T[p.ui]?p.ui:"hud";d.ui=u;d.theme=T[u];var m=typeof p.motion==="boolean"?p.motion:!matchMedia("(prefers-reduced-motion: reduce)").matches;var seen=localStorage.getItem("qm.boot")===new Date().toDateString();d.boot=(m&&!seen)?"pending":"done";}catch(e){d.boot="done";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${chakra.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <MotionRoot />
        {/* Fondo de partículas vectoriales. Va detrás de todo y no intercepta clics. */}
        <ArcadeField />
        <Hud />
        {children}
        <div className="hud-crt" aria-hidden />
      </body>
    </html>
  );
}
