"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import type { InviteResult } from "@/lib/invite";
import { Button } from "@/components/ui";

/** Muestra el link de acceso para compartir por WhatsApp o copiar. */
export function InviteLinkCard({ invite, firstName, phone }: { invite: InviteResult; firstName: string; phone?: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!invite.ok) {
    return (
      <div className="rounded-card border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn" role="status">
        {invite.message}
      </div>
    );
  }

  const message =
    invite.kind === "invite"
      ? `Hola ${firstName}, bienvenido a Alpha Prime Nutrition. Entrá a este link para crear tu contraseña y ver tu plan: ${invite.link}`
      : `Hola ${firstName}, entrá a este link para crear una nueva contraseña en Alpha Prime Nutrition: ${invite.link}`;
  const digits = (phone ?? "").replace(/\D/g, "");
  const waUrl = `https://wa.me/${digits.length >= 8 ? (digits.length === 8 ? "503" + digits : digits) : ""}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.ok ? invite.link : "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-ok/30 bg-ok/10 p-4">
      <p className="text-sm font-semibold text-ok">
        {invite.kind === "invite" ? "Link de acceso listo" : "Link para nueva contraseña listo"}
      </p>
      <p className="text-sm text-muted">
        Compartilo solo con {firstName}: con este link crea su contraseña. Vence en 1 hora; si vence, generá otro desde su perfil.
      </p>
      <input
        readOnly
        value={invite.link}
        aria-label="Link de acceso"
        onFocus={(e) => e.currentTarget.select()}
        className="h-10 w-full rounded-lg border border-line bg-graphite px-3 font-mono text-xs text-muted"
      />
      <div className="flex flex-wrap gap-2">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-semibold text-ink">
          <MessageCircle size={17} /> Enviar por WhatsApp
        </a>
        <Button type="button" variant="secondary" size="sm" className="h-10" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar link"}
        </Button>
      </div>
    </div>
  );
}
