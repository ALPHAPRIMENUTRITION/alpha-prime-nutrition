"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

const KEY = "ap-push-dismissed";
const SNOOZE_DAYS = 7;

function supported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function snoozed() {
  try {
    const t = Number(localStorage.getItem(KEY));
    return Boolean(t) && Date.now() - t < SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Suscribe este teléfono (si hace falta) y lo guarda a nombre del usuario que inició sesión. */
async function subscribe() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  const json = sub.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

/**
 * Pide permiso para mandar notificaciones al teléfono. El permiso solo lo puede
 * dar la persona tocando un botón; si ya lo dio, se mantiene la suscripción al día sin mostrar nada.
 */
export function PushPrompt({ audience = "client" }: { audience?: "client" | "coach" }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supported()) return;
    if (Notification.permission === "granted") {
      subscribe().catch(() => {});
      return;
    }
    if (Notification.permission === "default" && !snoozed()) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento: solo se oculta ahora */
    }
    setShow(false);
  };

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await subscribe();
        setShow(false);
      } else if (perm === "denied") {
        setMsg("Las bloqueaste. Podés activarlas en los ajustes del teléfono: Notificaciones → Alpha Prime.");
      } else {
        setBusy(false);
        return;
      }
    } catch {
      setMsg("No se pudieron activar. Probá de nuevo en un rato.");
    }
    setBusy(false);
  };

  const benefit =
    audience === "coach"
      ? "Enterate al momento cuando un cliente mande su check-in o reporte un pago."
      : "Enterate cuando tu coach te mande o cambie tu plan, y te recordamos el check-in y tu pago.";

  return (
    <Card className="relative flex flex-col gap-3 border-red/30 p-4 pr-11" role="region" aria-label="Activar notificaciones">
      <button type="button" onClick={dismiss} aria-label="Ahora no" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-faint hover:bg-panel-2 hover:text-fg">
        <X size={16} />
      </button>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red/15 text-red">
          <Bell size={22} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Activá las notificaciones</p>
          <p className="text-sm text-muted">{benefit}</p>
        </div>
      </div>
      <Button type="button" onClick={enable} disabled={busy} className="w-full sm:w-fit">
        <Bell size={17} /> {busy ? "Activando…" : "Activar notificaciones"}
      </Button>
      {msg && <p role="alert" className="text-sm text-bad">{msg}</p>}
    </Card>
  );
}
