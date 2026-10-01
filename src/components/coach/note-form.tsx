"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/coach/clientes/actions";
import { Button, Textarea } from "@/components/ui";

export function NoteForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form key={state.savedAt ?? "init"} action={formAction} className="flex flex-col gap-2">
      <label htmlFor="note_body" className="sr-only">Nueva nota privada</label>
      <Textarea id="note_body" name="body" placeholder="Escribí una observación privada…" required maxLength={5000} />
      {(state.fields?.body || state.error) && <p role="alert" className="text-sm text-bad">{state.fields?.body ?? state.error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Guardando…" : "Agregar nota"}</Button>
      </div>
    </form>
  );
}
