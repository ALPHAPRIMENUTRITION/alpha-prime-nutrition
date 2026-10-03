"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Smartphone } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Envía el link del cuestionario por el chat interno de la app. */
export function SendByChat({ action, chatHref }: { action: () => Promise<{ ok: boolean; error?: string }>; chatHref: string }) {
  const [state, setState] = useState<{ ok: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  if (state?.ok) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-ok">
        <Check size={16} /> Enviado por el chat de la app.
        <Link href={chatHref} className="font-semibold text-fg underline">
          Ver chat
        </Link>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div>
        <button type="button" disabled={pending} onClick={() => start(async () => setState(await action()))} className={buttonClass("primary", "sm")}>
          <Smartphone size={16} /> {pending ? "Enviando…" : "Enviar por el chat de la app"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
    </div>
  );
}
