"use client";

import { useEffect } from "react";

/** Quita la pantalla de bienvenida al terminar la animación. */
export function SplashController() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("ap-splash")) return;
    try {
      sessionStorage.setItem("ap-splash", "1");
    } catch {
      /* sin almacenamiento: igual se oculta */
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(() => html.classList.add("ap-splash-out"), reduce ? 600 : 1900);
    const t2 = setTimeout(() => html.classList.remove("ap-splash", "ap-splash-out"), reduce ? 900 : 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return null;
}
