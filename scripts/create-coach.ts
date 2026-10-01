/**
 * Crea (o promueve) un usuario COACH.
 *
 *   npm run create-coach -- --email carlos@tudominio.com --name "Carlos Aguilar" --password "UnaClaveLarga!"
 *
 * El rol se guarda en app_metadata, que solo puede escribir la service role.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");

  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const password = arg("password");
  if (!email || !name || !password) {
    throw new Error('Uso: npm run create-coach -- --email correo --name "Nombre Apellido" --password "clave"');
  }
  if (password.length < 10) throw new Error("Usá una contraseña de al menos 10 caracteres.");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "coach" },
    user_metadata: { full_name: name },
  });

  if (error) {
    if (!/already|registered|exists/i.test(error.message)) throw error;
    // Ya existe: se promueve a coach
    const existing = await findUserByEmail(admin, email);
    if (!existing) throw error;
    await admin.auth.admin.updateUserById(existing, { app_metadata: { role: "coach" } });
    const { error: pErr } = await admin.from("profiles").update({ role: "coach", full_name: name }).eq("id", existing);
    if (pErr) throw pErr;
    const { error: cErr } = await admin.from("coaches").upsert({ id: existing });
    if (cErr) throw cErr;
    console.log(`✔ ${email} ya existía y ahora es coach.`);
    return;
  }

  console.log(`✔ Coach creado: ${name} <${email}> (id ${data.user.id})`);
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
