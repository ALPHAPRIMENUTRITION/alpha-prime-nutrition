"use client";

import { useEffect } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window { __apInstall?: InstallEvent | null }
}

/**
 * Registra el service worker (solo en producción) y guarda el evento de
 * instalación de Chrome/Android apenas llega, aunque el aviso todavía no esté en pantalla.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__apInstall = e as InstallEvent;
      window.dispatchEvent(new Event("ap:installable"));
    };
    const onInstalled = () => {
      window.__apInstall = null;
      window.dispatchEvent(new Event("ap:installed"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
