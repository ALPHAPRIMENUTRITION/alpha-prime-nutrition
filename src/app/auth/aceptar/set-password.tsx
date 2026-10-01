"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import { Button, Field, Input } from "@/components/ui";

type Phase = "checking" | "ready" | "invalid" | "saving" | "done";

/** Cliente propio de esta página: procesamos el link nosotros (detectSessionInUrl desactivado). */
function authClient() {
  const env = publicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    isSingleton: false,
    auth: { detectSessionInUrl: false },
  });
}

/**
 * Recibe el link de invitación o de recuperación, abre la sesión y deja
 * crear la contraseña. Soporta los tres formatos de Supabase:
 * #access_token (invitación), ?code (PKCE) y ?token_hash.
 */
export function SetPassword() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = authClient();
    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      try {
        if (hash.get("error_description") || url.searchParams.get("error_description")) throw new Error("expired");
        if (hash.get("access_token") && hash.get("refresh_token")) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token")!,
          });
          if (error) throw error;
        } else if (url.searchParams.get("code")) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.searchParams.get("code")!);
          if (error) throw error;
        } else if (url.searchParams.get("token_hash")) {
          const type = (url.searchParams.get("type") ?? "invite") as "invite" | "recovery";
          const { error } = await supabase.auth.verifyOtp({ token_hash: url.searchParams.get("token_hash")!, type });
          if (error) throw error;
        }
        // Limpia los tokens de la barra de direcciones
        window.history.replaceState(null, "", "/auth/aceptar");
        const { data } = await supabase.auth.getUser();
        setPhase(data.user ? "ready" : "invalid");
      } catch (err) {
        console.error("invite_link", err instanceof Error ? err.message : err);
        setPhase("invalid");
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") ?? "");
    const pw2 = String(fd.get("password2") ?? "");
    if (pw.length < 8) return setError("Usá al menos 8 caracteres.");
    if (pw !== pw2) return setError("Las contraseñas no coinciden.");
    setError(null);
    setPhase("saving");
    const { error } = await authClient().auth.updateUser({ password: pw });
    if (error) {
      setPhase("ready");
      setError(/weak|short|least/i.test(error.message) ? "Elegí una contraseña más segura." : "No se pudo guardar. Intentá de nuevo.");
      return;
    }
    setPhase("done");
    window.location.assign("/");
  }

  if (phase === "checking") return <p className="text-muted">Verificando tu link…</p>;

  if (phase === "invalid") {
    return (
      <div role="alert" className="flex flex-col gap-2">
        <p className="font-display text-3xl font-extrabold uppercase leading-none">Link vencido</p>
        <p className="text-muted">Este link ya se usó o venció. Pedile a tu coach uno nuevo, o recuperá tu contraseña desde el inicio de sesión.</p>
        <a href="/recuperar" className="mt-2 text-sm font-semibold text-red underline underline-offset-4">Recuperar contraseña</a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nueva contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Repetí la contraseña" htmlFor="password2">
        <Input id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <Button type="submit" size="lg" disabled={phase !== "ready"} className="mt-2 w-full uppercase tracking-[0.12em]">
        {phase === "saving" || phase === "done" ? "Guardando…" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
