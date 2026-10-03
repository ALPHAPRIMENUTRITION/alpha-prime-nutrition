"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { WaLink } from "@/components/whatsapp/wa-link";

/** Copiar un link o mandarlo por WhatsApp. */
export function ShareLink({ url, waText, phone, compact = false }: { url: string; waText: string; phone?: string | null; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiá el link:", url);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      {!compact && <code className="break-all rounded-lg border border-line bg-ink px-3 py-2 text-sm text-muted">{url}</code>}
      <div className="flex flex-wrap gap-2">
        <WaLink phone={phone} text={`${waText}\n${url}`} className={buttonClass("primary", "sm")}>
          <MessageCircle size={16} /> Enviar por WhatsApp
        </WaLink>
        <button type="button" onClick={copy} className={buttonClass("secondary", "sm")}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
