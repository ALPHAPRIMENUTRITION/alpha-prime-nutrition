"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HOME_BY_ROLE } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const loginSchema = z.object({
  email: z.email("Escribí un correo válido.").max(254).transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, "La contraseña tiene al menos 8 caracteres.").max(128),
  next: z.string().optional(),
});

export type LoginState = { error?: string; fieldErrors?: Partial<Record<"email" | "password", string>> };

/** Solo se permite volver a rutas internas (evita redirecciones abiertas). */
function safeNext(next: string | undefined, role: UserRole) {
  const home = HOME_BY_ROLE[role];
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  return next.startsWith(home) ? next : home;
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Mensaje genérico: no revela si el correo existe.
    return { error: "Correo o contraseña incorrectos." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no tiene un perfil asignado. Contactá a tu coach." };
  }

  redirect(safeNext(parsed.data.next, profile.role as UserRole));
}
