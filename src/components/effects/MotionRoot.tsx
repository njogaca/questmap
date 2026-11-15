"use client";

import { useEffect } from "react";
import { useEffectsPrefs } from "./prefs";

/** Refleja las preferencias en <html data-motion data-crt data-theme> para que el CSS las use. */
export function MotionRoot() {
  const { motion, crt, theme } = useEffectsPrefs();
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    document.documentElement.dataset.crt = crt ? "on" : "off";
    document.documentElement.dataset.theme = theme;
  }, [motion, crt, theme]);
  return null;
}
