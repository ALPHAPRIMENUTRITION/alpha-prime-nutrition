"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAccessLink, type InviteResult } from "@/lib/invite";
import {
  clientSchema,
  fieldErrors,
  MEASUREMENT_FIELDS,
  measurementSchema,
  newClientSchema,
  noteSchema,
} from "@/lib/validation/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FormState = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
  clientId?: string;
  invite?: InviteResult;
  savedAt?: number;
  firstName?: string;
  phone?: string | null;
  /** Valores enviados, para no perderlos si hay un error */
  values?: Record<string, string>;
};

function formObject(fd: FormData) {
  return Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}

/** Confirma con RLS que el cliente pertenece al coach en sesión. */
async function ownedClient(clientId: string) {
  if (!UUID.test(clientId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, user_id, status")
    .eq("id", clientId)
    .maybeSingle();
  return data;
}

// ---------------------------------------------------------------- Clientes

export async function createClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireRole("coach");
  const values = formObject(fd);
  const parsed = newClientSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values, savedAt: Date.now() };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      coach_id: coach.id,
      first_name: d.first_name,
      last_name: d.last_name,
      email: d.email,
      phone: d.phone ?? null,
      goal: d.goal ?? null,
      start_date: d.start_date,
      renewal_date: d.renewal_date ?? null,
    })
    .select("id")
    .single();

  if (error || !client) {
    if (error?.code === "23505") return { fields: { email: "Ya tenés un cliente con ese correo." }, values, savedAt: Date.now() };
    return { error: "No se pudo crear el cliente. Revisá los datos e intentá de nuevo.", values, savedAt: Date.now() };
  }

  const clientId = client.id as string;
  await supabase.from("client_profiles").insert({
    client_id: clientId,
    birth_date: d.birth_date ?? null,
    sex: d.sex ?? null,
    height_cm: d.height_cm ?? null,
  });
  if (d.weight_kg) {
    await supabase.from("measurements").insert({ client_id: clientId, measured_at: d.start_date, weight_kg: d.weight_kg, created_by: coach.id });
  }
  if (d.note) {
    await supabase.from("coach_notes").insert({ client_id: clientId, coach_id: coach.id, body: d.note });
  }

  let invite: InviteResult | undefined;
  if (d.create_account) {
    invite = await createAccessLink({ clientId, email: d.email, fullName: `${d.first_name} ${d.last_name}` });
  }

  revalidatePath("/coach");
  return { ok: true, clientId, invite, firstName: d.first_name, phone: d.phone ?? null };
}

export async function updateClientAction(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("coach");
  const current = await ownedClient(clientId);
  if (!current) return { error: "Cliente no encontrado." };

  const values = formObject(fd);
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values, savedAt: Date.now() };
  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({
      first_name: d.first_name,
      last_name: d.last_name,
      // con cuenta vinculada, el correo de acceso no se cambia desde aquí
      email: current.user_id ? current.email : d.email,
      phone: d.phone ?? null,
      goal: d.goal ?? null,
      start_date: d.start_date,
      renewal_date: d.renewal_date ?? null,
    })
    .eq("id", clientId);
  if (error) {
    if (error.code === "23505") return { fields: { email: "Ya tenés un cliente con ese correo." }, values, savedAt: Date.now() };
    return { error: "No se pudieron guardar los cambios.", values, savedAt: Date.now() };
  }

  const { error: pErr } = await supabase
    .from("client_profiles")
    .upsert({ client_id: clientId, birth_date: d.birth_date ?? null, sex: d.sex ?? null, height_cm: d.height_cm ?? null });
  if (pErr) return { error: "Se guardaron los datos, pero no el perfil físico." };

  revalidatePath(`/coach/clientes/${clientId}`);
  revalidatePath("/coach");
  redirect(`/coach/clientes/${clientId}?guardado=1`);
}

export async function setClientStatusAction(clientId: string, status: "active" | "suspended") {
  await requireRole("coach");
  if (!(await ownedClient(clientId))) return;
  const supabase = await createClient();
  await supabase.from("clients").update({ status }).eq("id", clientId);
  revalidatePath(`/coach/clientes/${clientId}`);
  revalidatePath("/coach");
}

export async function accessLinkAction(clientId: string): Promise<InviteResult> {
  await requireRole("coach");
  const c = await ownedClient(clientId);
  if (!c) return { ok: false, reason: "error", message: "Cliente no encontrado." };
  const res = await createAccessLink({ clientId, email: c.email, fullName: `${c.first_name} ${c.last_name}` });
  revalidatePath(`/coach/clientes/${clientId}`);
  return res;
}

// ---------------------------------------------------------------- Antropometría

export async function addMeasurementAction(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireRole("coach");
  if (!(await ownedClient(clientId))) return { error: "Cliente no encontrado." };

  const raw = formObject(fd);
  const keep = { values: raw, savedAt: Date.now() };
  const parsed = measurementSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), ...keep };
  const d = parsed.data as Record<string, unknown> & { measured_at: string; notes?: string; fat_method?: string };

  // Otros campos configurables: nombre + valor
  const extra: Record<string, number> = {};
  for (let i = 0; i < 3; i++) {
    const name = String(raw[`extra_name_${i}`] ?? "").trim().slice(0, 40);
    const value = String(raw[`extra_value_${i}`] ?? "").trim().replace(",", ".");
    if (!name && !value) continue;
    const n = Number(value);
    if (!name || !value || !Number.isFinite(n) || n < 0 || n > 1000) {
      return { fields: { [`extra_${i}`]: "Completá nombre y un valor numérico válido." }, ...keep };
    }
    extra[name] = n;
  }

  const bodyKeys = MEASUREMENT_FIELDS.filter((f) => f.key !== "body_fat_pct").map((f) => f.key);
  const values = Object.fromEntries(bodyKeys.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]));
  const fat = d.body_fat_pct as number | undefined;

  if (!Object.keys(values).length && fat === undefined && !Object.keys(extra).length) {
    return { error: "Registrá al menos una medida.", ...keep };
  }

  const supabase = await createClient();
  if (Object.keys(values).length || Object.keys(extra).length || d.notes) {
    const { error } = await supabase.from("measurements").insert({
      client_id: clientId,
      measured_at: d.measured_at,
      ...values,
      extra,
      notes: d.notes ?? null,
      created_by: coach.id,
    });
    if (error) return { error: "No se pudo guardar la medición." };
  }
  if (fat !== undefined) {
    const { error } = await supabase.from("body_composition").insert({
      client_id: clientId,
      measured_at: d.measured_at,
      body_fat_pct: fat,
      method: d.fat_method ?? null,
      created_by: coach.id,
    });
    if (error) return { error: "No se pudo guardar el % de grasa." };
  }

  revalidatePath(`/coach/clientes/${clientId}`);
  revalidatePath("/coach");
  return { ok: true, savedAt: Date.now() };
}

export async function deleteMeasurementAction(clientId: string, measurementId: string | null, bodyCompId: string | null) {
  await requireRole("coach");
  if (!(await ownedClient(clientId))) return;
  const supabase = await createClient();
  if (measurementId && UUID.test(measurementId)) await supabase.from("measurements").delete().eq("id", measurementId).eq("client_id", clientId);
  if (bodyCompId && UUID.test(bodyCompId)) await supabase.from("body_composition").delete().eq("id", bodyCompId).eq("client_id", clientId);
  revalidatePath(`/coach/clientes/${clientId}`);
  revalidatePath("/coach");
}

// ---------------------------------------------------------------- Notas y fotos

export async function addNoteAction(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireRole("coach");
  if (!(await ownedClient(clientId))) return { error: "Cliente no encontrado." };
  const parsed = noteSchema.safeParse(formObject(fd));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("coach_notes").insert({ client_id: clientId, coach_id: coach.id, body: parsed.data.body });
  if (error) return { error: "No se pudo guardar la nota." };
  revalidatePath(`/coach/clientes/${clientId}`);
  return { ok: true, savedAt: Date.now() };
}

export async function deleteNoteAction(clientId: string, noteId: string) {
  await requireRole("coach");
  if (!UUID.test(noteId)) return;
  const supabase = await createClient();
  await supabase.from("coach_notes").delete().eq("id", noteId).eq("client_id", clientId);
  revalidatePath(`/coach/clientes/${clientId}`);
}

export async function deletePhotoAction(clientId: string, photoId: string) {
  await requireRole("coach");
  if (!UUID.test(photoId)) return;
  const supabase = await createClient();
  const { data: photo } = await supabase.from("progress_photos").select("storage_path").eq("id", photoId).eq("client_id", clientId).maybeSingle();
  if (!photo) return;
  await supabase.storage.from("progress-photos").remove([photo.storage_path]);
  await supabase.from("progress_photos").delete().eq("id", photoId);
  revalidatePath(`/coach/clientes/${clientId}`);
}
