"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui";

export function RecoverForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("Escribí un correo válido.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/aceptar`,
    });
    setBusy(false);
    if (error && /rate|limit/i.test(error.message)) return setError("Demasiados intentos. Esperá unos minutos.");
    // Mismo mensaje exista o no la cuenta
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
        Si el correo tiene una cuenta, te llegará un link para crear una nueva contraseña. Si no te llega, pedile a tu coach un link de acceso.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Correo" htmlFor="email" error={error ?? undefined}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <Button type="submit" size="lg" disabled={busy} className="w-full uppercase tracking-[0.12em]">
        {busy ? "Enviando…" : "Enviar link"}
      </Button>
    </form>
  );
}
