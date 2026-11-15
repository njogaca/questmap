import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
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
  themeColor: "#05070b",
  width: "device-width",
  initialScale: 1,
};

/**
 * Decide ANTES del primer frame si toca la pantalla de arranque (una vez al día y solo con
 * animaciones activas). Lee las mismas claves de localStorage que src/components/effects/prefs.ts.
 */
const BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("qm.effects")||"{}");var m=typeof p.motion==="boolean"?p.motion:!matchMedia("(prefers-reduced-motion: reduce)").matches;var seen=localStorage.getItem("qm.boot")===new Date().toDateString();document.documentElement.dataset.boot=(m&&!seen)?"pending":"done";}catch(e){document.documentElement.dataset.boot="done";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${chakra.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <MotionRoot />
        <Hud />
        {children}
        <div className="hud-crt" aria-hidden />
      </body>
    </html>
  );
}
