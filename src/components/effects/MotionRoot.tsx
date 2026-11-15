"use client";

import { useEffect } from "react";
import { useEffectsPrefs } from "./prefs";

/** Refleja las preferencias en <html data-motion data-crt data-theme data-ui> para que el CSS las use. */
export function MotionRoot() {
  const { motion, crt, theme, ui } = useEffectsPrefs();
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    document.documentElement.dataset.crt = crt ? "on" : "off";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.ui = ui;
  }, [motion, crt, theme, ui]);
  return null;
}
