"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FILE_QUESTIONS, isVisible, parseIntake, SERVICE_VALUE, SEX_VALUE, type IntakeAnswers } from "@/lib/intake";
import { lbToKg } from "@/lib/units";

export type IntakeState = {
  ok?: boolean;
  firstName?: string;
  errors?: Record<string, string>;
  error?: string;
  answers?: IntakeAnswers;
  savedAt?: number;
};

const FILE_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
const MAX_FILE = 5 * 1024 * 1024;

/** Sube fotos/PDF del plan anterior a la carpeta privada del cliente. */
async function uploadIntakeFiles(token: string, files: File[]): Promise<{ paths: string[] } | { error: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { paths: [] };
  if (files.length > 3) return { error: "Podés subir hasta 3 archivos." };
  for (const f of files) {
    if (!FILE_TYPES[f.type]) return { error: "Los archivos tienen que ser fotos o PDF." };
    if (f.size > MAX_FILE) return { error: "Cada archivo puede pesar hasta 5 MB." };
  }
  const admin = createAdminClient();
  const { data: client } = await admin.from("clients").select("id").eq("intake_token", token).maybeSingle();
  if (!client) return { error: "Este link no es válido." };
  const paths: string[] = [];
  for (const f of files) {
    const path = `${client.id}/${crypto.randomUUID()}.${FILE_TYPES[f.type]}`;
    const { error } = await admin.storage.from("intake-files").upload(path, f, { contentType: f.type, upsert: false });
    if (error) return { error: "No se pudieron subir los archivos. Probá de nuevo." };
    paths.push(path);
  }
  return { paths };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guarda el cuestionario. Público: sin sesión. Con token queda en el expediente del cliente. */
export async function submitIntakeAction(token: string | null, _prev: IntakeState, fd: FormData): Promise<IntakeState> {
  // Campo trampa para robots: una persona nunca lo ve ni lo llena
  if (String(fd.get("website") ?? "")) return { ok: true, firstName: "" };
  if (token && !UUID.test(token)) return { error: "Este link no es válido." };

  const parsed = parseIntake(fd, token ? "full" : "short");
  const errors = parsed.ok ? {} : { ...parsed.errors };
  if (!fd.get("consent")) errors.consent = "Necesitamos tu autorización para usar estos datos.";
  if (Object.keys(errors).length) {
    return { errors, answers: parsed.answers, error: "Revisá los campos marcados en rojo.", savedAt: Date.now() };
  }

  const a = parsed.answers;
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
  const p: { answers: IntakeAnswers } & Record<string, unknown> = {
    first_name: s("first_name"),
    last_name: s("last_name"),
    email: s("email"),
    phone: s("phone"),
    birth_date: s("birth_date"),
    sex: SEX_VALUE[s("sex")] ?? "",
    height_cm: s("height_cm"),
    weight_kg: s("weight_lb") ? String(lbToKg(Number(s("weight_lb")))) : "",
    goal: s("goal"),
    service: SERVICE_VALUE[s("service") as keyof typeof SERVICE_VALUE] ?? "",
    answers: a,
  };

  // Fotos y archivos (solo en el cuestionario completo, con link de cliente)
  if (token) {
    const extra: IntakeAnswers = {};
    for (const q of FILE_QUESTIONS) {
      if (!isVisible(q, a)) continue;
      const files = fd.getAll(q.key).filter((f): f is File => f instanceof File && f.size > 0).slice(0, q.maxFiles ?? 3);
      if (q.photosOnly && files.some((f) => !f.type.startsWith("image/"))) return { error: "Las fotos tienen que ser imágenes.", answers: a, savedAt: Date.now() };
      if (!files.length) continue;
      const up = await uploadIntakeFiles(token, files);
      if ("error" in up) return { error: up.error, answers: a, savedAt: Date.now() };
      if (up.paths.length) extra[q.key] = up.paths;
    }
    p.answers = { ...a, ...extra };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_intake", { p, p_token: token });
  if (error) {
    const msg = error.message.includes("Demasiados") ? "Recibimos varios envíos seguidos. Probá de nuevo en unos minutos." : error.message.includes("Link") ? "Este link no es válido." : "No se pudo enviar. Intentá de nuevo.";
    return { error: msg, answers: a, savedAt: Date.now() };
  }
  if (token) await syncClientData(token, p).catch(() => {});
  return { ok: true, firstName: s("first_name") };
}

/** Pasa al expediente del cliente lo que todavía no tenga: fecha de nacimiento, sexo, estatura y peso inicial. */
async function syncClientData(token: string, p: Record<string, unknown>) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createAdminClient();
  const { data: client } = await admin.from("clients").select("id").eq("intake_token", token).maybeSingle();
  if (!client) return;
  const str = (k: string) => (typeof p[k] === "string" && p[k] ? (p[k] as string) : null);
  const birth = str("birth_date");
  const sex = str("sex");
  const height = Number(str("height_cm")) || null;
  const weight = Number(str("weight_kg")) || null;

  const { data: prof } = await admin.from("client_profiles").select("birth_date, sex, height_cm").eq("client_id", client.id).maybeSingle();
  const patch: Record<string, unknown> = {};
  if (birth && !prof?.birth_date) patch.birth_date = birth;
  if (sex && !prof?.sex) patch.sex = sex;
  if (height && height >= 50 && height <= 260 && !prof?.height_cm) patch.height_cm = height;
  if (Object.keys(patch).length) {
    if (prof) await admin.from("client_profiles").update(patch).eq("client_id", client.id);
    else await admin.from("client_profiles").insert({ client_id: client.id, ...patch });
  }

  if (weight && weight >= 20 && weight <= 400) {
    const { count } = await admin.from("measurements").select("id", { count: "exact", head: true }).eq("client_id", client.id).not("weight_kg", "is", null);
    if (!count) await admin.from("measurements").insert({ client_id: client.id, weight_kg: Math.round(weight * 100) / 100 });
  }
}
