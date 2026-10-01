"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Button, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Correo" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="tu@correo.com" />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={state.fieldErrors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      {state.error && (
        <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full uppercase tracking-[0.12em]">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
