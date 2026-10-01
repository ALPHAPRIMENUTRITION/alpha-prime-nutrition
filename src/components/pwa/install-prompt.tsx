"use client";

import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { Button, Card } from "@/components/ui";

const KEY = "ap-install-dismissed";
const SNOOZE_DAYS = 14;

type Mode = "hidden" | "android" | "ios";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function snoozed() {
  try {
    const t = Number(localStorage.getItem(KEY));
    return Boolean(t) && Date.now() - t < SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/** Invita a instalar la app en la pantalla de inicio. No aparece si ya está instalada. */
export function InstallPrompt({ audience = "client" }: { audience?: "client" | "coach" }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    // En iPhone solo Safari permite "Agregar a inicio"
    const iosSafari = ios && !/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV/.test(ua);
    const sync = () => setMode(window.__apInstall ? "android" : iosSafari ? "ios" : "hidden");
    sync();
    const hide = () => setMode("hidden");
    window.addEventListener("ap:installable", sync);
    window.addEventListener("ap:installed", hide);
    return () => {
      window.removeEventListener("ap:installable", sync);
      window.removeEventListener("ap:installed", hide);
    };
  }, []);

  if (mode === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento: solo se oculta ahora */
    }
    setMode("hidden");
  };

  const install = async () => {
    const ev = window.__apInstall;
    if (!ev) return;
    setBusy(true);
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    window.__apInstall = null;
    setBusy(false);
    if (outcome === "accepted") setMode("hidden");
  };

  const benefit = audience === "coach" ? "Abrí tu panel con un toque, como cualquier app." : "Tu plan, tu entreno y tus check-ins a un toque, como cualquier app.";

  return (
    <Card className="relative flex flex-col gap-3 border-red/30 p-4 pr-11" role="region" aria-label="Instalar la app">
      <button type="button" onClick={dismiss} aria-label="Ahora no" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-faint hover:bg-panel-2 hover:text-fg">
        <X size={16} />
      </button>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold">Instalá Alpha Prime</p>
          <p className="text-sm text-muted">{benefit}</p>
        </div>
      </div>
      {mode === "android" ? (
        <Button type="button" onClick={install} disabled={busy} className="w-full sm:w-fit">
          <Download size={17} /> {busy ? "Abriendo…" : "Instalar app"}
        </Button>
      ) : (
        <ol className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center gap-2">
            <span className="tnum grid h-5 w-5 place-items-center rounded-full bg-panel-2 text-[11px] font-bold">1</span>
            Tocá <Share size={16} className="text-fg" aria-label="Compartir" /> <span className="font-semibold">Compartir</span> en Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="tnum grid h-5 w-5 place-items-center rounded-full bg-panel-2 text-[11px] font-bold">2</span>
            Elegí <PlusSquare size={16} className="text-fg" aria-hidden="true" /> <span className="font-semibold">Agregar a inicio</span>
          </li>
        </ol>
      )}
    </Card>
  );
}
