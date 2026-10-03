import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { waTo } from "@/lib/site";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Abre WhatsApp con la persona y marca la solicitud como "Contactado". */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionProfile();
  if (!me || me.role !== "coach" || !UUID.test(id)) return Response.redirect(new URL("/coach/solicitudes", req.url), 302);
  const supabase = await createClient();
  const { data: i } = await supabase.from("intakes").select("first_name, phone, status").eq("id", id).maybeSingle();
  if (!i?.phone) return Response.redirect(new URL(`/coach/solicitudes/${id}`, req.url), 302);
  if (["new", "reviewed"].includes(i.status)) await supabase.from("intakes").update({ status: "contacted" }).eq("id", id);
  return Response.redirect(waTo(i.phone, `¡Hola ${i.first_name}! Soy Carlos de Alpha Prime. Recibí tu solicitud y con gusto te cuento cómo funciona.`), 302);
}
