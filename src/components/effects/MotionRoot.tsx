"use client";

import { useEffect } from "react";
import { useEffectsPrefs } from "./prefs";

/** Refleja la preferencia de animaciones en <html data-motion="on|off"> para que el CSS la use. */
export function MotionRoot() {
  const { motion } = useEffectsPrefs();
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
  }, [motion]);
  return null;
}
