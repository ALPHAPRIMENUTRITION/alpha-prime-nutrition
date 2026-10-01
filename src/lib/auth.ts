import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export const HOME_BY_ROLE: Record<UserRole, string> = {
  coach: "/coach",
  client: "/portal",
};

/** Usuario y perfil de la petición actual (memoizado por request). */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", auth.user.id)
    .single();

  return (data as Profile | null) ?? null;
});

/**
 * Exige sesión y rol. Si el rol no coincide, envía al usuario a su inicio.
 * Úsalo en layouts/páginas del servidor. Los datos siguen protegidos por RLS
 * aunque alguien se saltara esta comprobación.
 */
export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(HOME_BY_ROLE[profile.role]);
  return profile;
}
