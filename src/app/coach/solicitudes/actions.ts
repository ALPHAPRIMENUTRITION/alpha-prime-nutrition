"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setIntakeStatusAction(id: string, status: "reviewed" | "contacted" | "lost" | "archived") {
  await requireRole("coach");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("intakes").update({ status }).eq("id", id);
  revalidatePath("/coach/solicitudes");
  revalidatePath(`/coach/solicitudes/${id}`);
}

export async function deleteIntakeAction(id: string) {
  await requireRole("coach");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("intakes").delete().eq("id", id);
  revalidatePath("/coach/solicitudes");
  redirect("/coach/solicitudes");
}

/** Al escribirle por WhatsApp la solicitud pasa a "Contactado". */
export async function markContactedAction(id: string) {
  await requireRole("coach");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("intakes").update({ status: "contacted" }).eq("id", id).in("status", ["new", "reviewed"]);
  revalidatePath("/coach/solicitudes");
}
