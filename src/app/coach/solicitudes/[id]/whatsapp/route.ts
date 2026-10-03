import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTemplates } from "@/lib/data/intakes";
import { fillTemplate, templateVars } from "@/lib/messages";
import { waTo } from "@/lib/site";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Abre WhatsApp con un mensaje rápido ya armado y marca la solicitud como "Contactado". */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionProfile();
  if (!me || me.role !== "coach" || !UUID.test(id)) return Response.redirect(new URL("/coach/solicitudes", req.url), 302);
  const supabase = await createClient();
  const { data: i } = await supabase.from("intakes").select("first_name, phone, status, goal, service, answers").eq("id", id).maybeSingle();
  if (!i?.phone) return Response.redirect(new URL(`/coach/solicitudes/${id}`, req.url), 302);
  if (["new", "reviewed"].includes(i.status)) await supabase.from("intakes").update({ status: "contacted" }).eq("id", id);

  const templates = await getTemplates(me.id);
  const m = Number(new URL(req.url).searchParams.get("m") ?? 0);
  const t = templates[Number.isInteger(m) && m >= 0 && m < templates.length ? m : 0];
  const text = fillTemplate(t?.body ?? "",  templateVars({ first_name: i.first_name, goal: i.goal, service: i.service, answers: i.answers ?? {} }));
  return Response.redirect(waTo(i.phone, text), 302);
}
