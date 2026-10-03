import webpush from "web-push";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ id: z.uuid() });
type Claimed = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  subscriptions: { endpoint: string; p256dh: string; auth: string }[];
};

/**
 * La llama la base de datos (trigger + pg_net) cuando se crea un aviso.
 * No necesita secreto: claim_push solo devuelve avisos reales, de los últimos
 * minutos y una sola vez; cualquier otra cosa no envía nada.
 */
export async function POST(req: Request) {
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false, reason: "sin configurar" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_push", { p_id: parsed.data.id });
  if (error) return Response.json({ ok: false }, { status: 500 });
  const n = data as Claimed | null;
  if (!n) return Response.json({ ok: true, sent: 0 });

  webpush.setVapidDetails("https://alphaprimenutrition.com", VAPID_PUBLIC_KEY, priv);
  const payload = JSON.stringify({ title: n.title, body: n.body ?? "", link: n.link || "/", tag: n.id });

  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    n.subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "normal" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint);
      }
    }),
  );
  if (gone.length) await admin.rpc("drop_push_endpoints", { p_endpoints: gone });
  return Response.json({ ok: true, sent });
}
