"use client";

import { useEffect } from "react";
import { useEffectsPrefs } from "./prefs";

/** Refleja las preferencias en <html data-motion data-crt> para que el CSS las use. */
export function MotionRoot() {
  const { motion, crt } = useEffectsPrefs();
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    document.documentElement.dataset.crt = crt ? "on" : "off";
  }, [motion, crt]);
  return null;
}
