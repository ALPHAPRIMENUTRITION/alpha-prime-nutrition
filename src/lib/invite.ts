import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";

export type InviteResult =
  | { ok: true; link: string; kind: "invite" | "recovery" }
  | { ok: false; reason: "no_key" | "taken" | "error"; message: string };

export function invitesEnabled() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Crea (o reutiliza) la cuenta de acceso del cliente y devuelve un link
 * para que defina su contraseña. El link se comparte por WhatsApp o correo:
 * no depende del servicio de email de Supabase.
 *
 * Seguridad: el llamador ya verificó con RLS que el cliente es de este coach.
 */
export async function createAccessLink(params: { clientId: string; email: string; fullName: string }): Promise<InviteResult> {
  if (!invitesEnabled()) {
    return { ok: false, reason: "no_key", message: "Las invitaciones se activan al configurar SUPABASE_SERVICE_ROLE_KEY." };
  }
  const admin = createAdminClient();
  const redirectTo = `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/aceptar`;

  // ¿Ya está vinculado a una cuenta?
  const { data: client } = await admin.from("clients").select("user_id").eq("id", params.clientId).single();

  let userId = client?.user_id as string | null;
  let kind: "invite" | "recovery" = "invite";
  let link: string | undefined;
  // El link apunta a nuestra página con el token en la URL; el token solo se
  // consume cuando la persona toca "Activar". Así las vistas previas de
  // WhatsApp/Telegram (que abren los links) no lo gastan.
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const ownLink = (hashed: string, type: "invite" | "recovery") =>
    `${site}/auth/aceptar?token_hash=${encodeURIComponent(hashed)}&type=${type}`;

  if (!userId) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: params.email,
      options: { redirectTo, data: { full_name: params.fullName } },
    });
    if (!error && data.user) {
      userId = data.user.id;
      link = ownLink(data.properties.hashed_token, "invite");
    } else if (error && /already|registered|exists/i.test(error.message)) {
      // El correo ya tiene cuenta: solo se vincula si es de cliente y está libre.
      const existing = await findUserIdByEmail(params.email);
      if (!existing) return { ok: false, reason: "error", message: "No se pudo generar la invitación." };
      const [{ data: prof }, { data: linked }] = await Promise.all([
        admin.from("profiles").select("role").eq("id", existing).single(),
        admin.from("clients").select("id").eq("user_id", existing).maybeSingle(),
      ]);
      if (prof?.role !== "client" || (linked && linked.id !== params.clientId)) {
        return { ok: false, reason: "taken", message: "Ese correo ya pertenece a otra cuenta." };
      }
      userId = existing;
    } else {
      return { ok: false, reason: "error", message: "No se pudo generar la invitación." };
    }

    const { error: linkErr } = await admin.from("clients").update({ user_id: userId }).eq("id", params.clientId).is("user_id", null);
    if (linkErr) return { ok: false, reason: "error", message: "No se pudo vincular la cuenta." };
  }

  if (!link) {
    // Cuenta existente o ya vinculada: link para (re)definir contraseña.
    const { data: u } = await admin.auth.admin.getUserById(userId!);
    const neverConfirmed = !u.user?.email_confirmed_at && !u.user?.last_sign_in_at;
    const { data, error } = await admin.auth.admin.generateLink({
      type: neverConfirmed ? "invite" : "recovery",
      email: u.user?.email ?? params.email,
      options: { redirectTo },
    });
    if (error) return { ok: false, reason: "error", message: "No se pudo generar el link." };
    kind = neverConfirmed ? "invite" : "recovery";
    link = ownLink(data.properties.hashed_token, kind);
  }

  return { ok: true, link, kind };
}

/** Estado de la cuenta del cliente (solo servidor). */
export async function accountStatus(userId: string | null): Promise<"none" | "pending" | "active" | "unknown"> {
  if (!userId) return "none";
  if (!invitesEnabled()) return "unknown";
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  if (!data.user) return "none";
  return data.user.last_sign_in_at ? "active" : "pending";
}

async function findUserIdByEmail(email: string) {
  const admin = createAdminClient();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
