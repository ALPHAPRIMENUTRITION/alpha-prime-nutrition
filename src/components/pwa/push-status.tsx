"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { subscribe } from "@/components/pwa/push-prompt";
import { sendTestPushAction } from "@/app/notifications-actions";
import { cn } from "@/lib/cn";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

/** Estado de las notificaciones en este dispositivo, con botón para activar y probar. */
export function PushStatus() {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      if (Notification.permission !== "granted") return setState("off");
      try {
        await subscribe(); // guarda este celular a nombre de la cuenta con la que entraste
        setState("on");
      } catch {
        setState("off");
      }
    })();
  }, []);

  const activate = () =>
    start(async () => {
      setMsg(null);
      const perm = await Notification.requestPermission();
      if (perm === "denied") return setState("denied");
      if (perm !== "granted") return;
      try {
        await subscribe();
        setState("on");
      } catch {
        setMsg({ ok: false, text: "No se pudieron activar. Probá de nuevo." });
      }
    });

  const test = () =>
    start(async () => {
      setMsg(null);
      const r = await sendTestPushAction();
      setMsg(
        r.ok
          ? { ok: true, text: `Enviada a ${r.devices} ${r.devices === 1 ? "dispositivo" : "dispositivos"}. Debería llegarte en unos segundos.` }
          : { ok: false, text: r.error ?? "No se pudo enviar." },
      );
    });

  const on = state === "on";
  return (
    <div className={cn("flex flex-col gap-3 rounded-card border p-4", on ? "border-line bg-panel" : "border-red/40 bg-red/10")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", on ? "bg-ok/15 text-ok" : "bg-red/15 text-red")}>
          {on ? <BellRing size={20} /> : <BellOff size={20} />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            {state === "loading" ? "Revisando…" : on ? "Notificaciones activadas en este dispositivo" : "Notificaciones desactivadas en este dispositivo"}
          </p>
          <p className="text-sm text-muted">
            {state === "unsupported" && "Este navegador no las permite. En iPhone, instalá la app en la pantalla de inicio."}
            {state === "denied" && "Las bloqueaste. Activalas en Ajustes del teléfono → Aplicaciones → Alpha Prime → Notificaciones."}
            {state === "off" && "Activalas para recibir avisos aunque tengas la app cerrada."}
            {on && "Las notificaciones llegan a la cuenta con la que entraste en este dispositivo."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {state === "off" && (
          <button type="button" onClick={activate} disabled={pending} className={buttonClass("primary", "sm")}>
            <BellRing size={16} /> Activar
          </button>
        )}
        {on && (
          <button type="button" onClick={test} disabled={pending} className={buttonClass("secondary", "sm")}>
            <Send size={16} /> {pending ? "Enviando…" : "Enviarme una prueba"}
          </button>
        )}
      </div>
      {msg && <p role="status" className={cn("text-sm", msg.ok ? "text-ok" : "text-bad")}>{msg.text}</p>}
    </div>
  );
}
