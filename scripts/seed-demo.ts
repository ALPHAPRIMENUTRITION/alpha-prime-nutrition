/**
 * Datos de demostración (ficticios). Se puede ejecutar varias veces:
 * borra y vuelve a crear las cuentas @alphaprime.demo.
 *
 *   npm run seed
 *
 * NO ejecutar en producción con clientes reales.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DOMAIN = "alphaprime.demo";
const PASSWORD = process.env.DEMO_PASSWORD || "AlphaDemo2026!";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const ts = (offsetDays: number, hour = 15) => `${iso(offsetDays)}T${String(hour).padStart(2, "0")}:00:00Z`;
const lerp = (a: number, b: number, t: number) => Math.round((a + (b - a) * t) * 10) / 10;

interface DemoClient {
  key: string;
  first: string;
  last: string;
  goal: string;
  sex: "male" | "female";
  birth: string;
  height: number;
  startOffset: number; // días desde hoy (negativo = pasado)
  renewalOffset: number;
  weight: [number, number];
  waist: [number, number];
  fat: [number, number];
  adherence: number[]; // por semana, del más antiguo al más reciente
  lastCheckinOffset: number;
  subscription: { status: "active" | "past_due" | "canceled"; amount: number };
  payments: { offset: number; amount: number; status: "succeeded" | "failed" }[];
  note: string;
}

const CLIENTS: DemoClient[] = [
  {
    key: "juan", first: "Juan", last: "Pérez", goal: "Recomposición corporal", sex: "male", birth: "1994-03-12", height: 178,
    startOffset: -84, renewalOffset: 18, weight: [84.0, 80.6], waist: [92, 86.5], fat: [22.0, 18.4],
    adherence: [78, 84, 88, 86, 91, 90, 93, 94], lastCheckinOffset: -2,
    subscription: { status: "active", amount: 6000 },
    payments: [{ offset: -72, amount: 6000, status: "succeeded" }, { offset: -42, amount: 6000, status: "succeeded" }, { offset: -12, amount: 6000, status: "succeeded" }],
    note: "Responde bien a carbohidratos altos los días de pierna. Revisar sueño.",
  },
  {
    key: "maria", first: "María", last: "López", goal: "Pérdida de grasa", sex: "female", birth: "1990-08-25", height: 163,
    startOffset: -56, renewalOffset: 4, weight: [71.2, 68.3], waist: [82, 77.5], fat: [31.5, 28.9],
    adherence: [82, 75, 79, 72, 74], lastCheckinOffset: -9,
    subscription: { status: "active", amount: 6000 },
    payments: [{ offset: -56, amount: 6000, status: "succeeded" }, { offset: -26, amount: 6000, status: "succeeded" }],
    note: "Fines de semana difíciles. Darle opciones de comidas fuera de casa.",
  },
  {
    key: "pedro", first: "Pedro", last: "Ramírez", goal: "Ganancia muscular", sex: "male", birth: "1999-11-02", height: 182,
    startOffset: -120, renewalOffset: -12, weight: [72.5, 75.1], waist: [79, 80.5], fat: [14.0, 14.8],
    adherence: [70, 66, 61, 58, 63, 55], lastCheckinOffset: -24,
    subscription: { status: "canceled", amount: 6000 },
    payments: [{ offset: -102, amount: 6000, status: "succeeded" }, { offset: -72, amount: 6000, status: "succeeded" }, { offset: -42, amount: 6000, status: "succeeded" }],
    note: "Pausó por viaje de trabajo. Retomar con volumen moderado.",
  },
  {
    key: "ana", first: "Ana", last: "Torres", goal: "Rendimiento deportivo (10K)", sex: "female", birth: "1996-05-17", height: 168,
    startOffset: -35, renewalOffset: -2, weight: [60.4, 59.6], waist: [70, 68.5], fat: [24.0, 22.6],
    adherence: [85, 90, 88, 92], lastCheckinOffset: -4,
    subscription: { status: "past_due", amount: 6000 },
    payments: [{ offset: -35, amount: 6000, status: "succeeded" }, { offset: -2, amount: 6000, status: "failed" }],
    note: "Carrera objetivo en 8 semanas. Priorizar recuperación.",
  },
];

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${(error as { message?: string }).message ?? String(error)}`);
  return data;
}

async function deleteDemoUsers(db: SupabaseClient) {
  const ids: string[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    ids.push(...data.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`)).map((u) => u.id));
    if (data.users.length < 200) break;
  }
  if (!ids.length) return;
  // Los clientes impiden borrar al coach (on delete restrict): primero ellos.
  await must(db.from("clients").delete().in("coach_id", ids), "borrar clientes demo");
  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  console.log(`• ${ids.length} cuentas demo anteriores eliminadas`);
}

async function createUser(email: string, fullName: string, role: "coach" | "client") {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`crear ${email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  await deleteDemoUsers(admin);

  const coachId = await createUser(`coach@${DOMAIN}`, "Carlos Aguilar", "coach");
  await must(admin.from("coaches").update({ business_name: "Alpha Prime Nutrition", grace_period_days: 5, checkin_weekday: 1 }).eq("id", coachId), "configurar coach");
  console.log("✔ Coach Carlos Aguilar");

  for (const c of CLIENTS) {
    const userId = await createUser(`${c.key}@${DOMAIN}`, `${c.first} ${c.last}`, "client");

    const client = await must(
      admin
        .from("clients")
        .insert({
          coach_id: coachId,
          user_id: userId,
          first_name: c.first,
          last_name: c.last,
          email: `${c.key}@${DOMAIN}`,
          phone: "+503 0000-0000",
          goal: c.goal,
          start_date: iso(c.startOffset),
          renewal_date: iso(c.renewalOffset),
        })
        .select("id")
        .single(),
      `cliente ${c.first}`,
    );
    const clientId = (client as { id: string }).id;

    await must(admin.from("client_profiles").insert({ client_id: clientId, birth_date: c.birth, sex: c.sex, height_cm: c.height }), "perfil");
    await must(admin.from("coach_notes").insert({ client_id: clientId, coach_id: coachId, body: c.note }), "nota");

    // Mediciones cada 14 días desde el inicio
    const span = -c.startOffset;
    const points = Math.max(2, Math.floor(span / 14) + 1);
    const measurements = Array.from({ length: points }, (_, i) => {
      const t = i / (points - 1);
      return {
        client_id: clientId,
        measured_at: iso(c.startOffset + Math.round(t * Math.min(span, (points - 1) * 14))),
        weight_kg: lerp(c.weight[0], c.weight[1], t),
        waist_cm: lerp(c.waist[0], c.waist[1], t),
        created_by: coachId,
      };
    });
    await must(admin.from("measurements").insert(measurements), "mediciones");
    await must(
      admin.from("body_composition").insert(
        measurements.map((m, i) => ({
          client_id: clientId,
          measured_at: m.measured_at,
          body_fat_pct: lerp(c.fat[0], c.fat[1], i / (points - 1)),
          method: "Pliegues cutáneos (Jackson-Pollock 7)",
          created_by: coachId,
        })),
      ),
      "composición corporal",
    );

    // Check-ins semanales; el último en lastCheckinOffset
    const n = c.adherence.length;
    const checkins = c.adherence.map((adh, i) => {
      const offset = c.lastCheckinOffset - (n - 1 - i) * 7;
      const planned = 4;
      const completed = Math.max(1, Math.min(planned, Math.round((adh / 100) * planned)));
      return {
        client_id: clientId,
        week_start: iso(offset - 6),
        submitted_at: ts(offset, 14 + (i % 5)),
        weight_kg: lerp(c.weight[0], c.weight[1], (i + 1) / n),
        waist_cm: lerp(c.waist[0], c.waist[1], (i + 1) / n),
        nutrition_adherence_pct: adh,
        workouts_planned: planned,
        workouts_completed: completed,
        cardio_minutes: 60 + (i % 3) * 30,
        sleep_hours: 6.5 + (i % 3) * 0.5,
        energy: 6 + (i % 4),
        hunger: 4 + (i % 3),
        stress: 3 + (i % 4),
        comments: i === n - 1 ? "Buena semana en general." : null,
        status: i < n - 1 ? "reviewed" : "submitted",
        reviewed_at: i < n - 1 ? ts(offset + 1, 16) : null,
      };
    });
    await must(admin.from("checkins").insert(checkins), "check-ins");

    const sub = await must(
      admin
        .from("subscriptions")
        .insert({
          client_id: clientId,
          provider: "manual",
          status: c.subscription.status,
          plan_name: "Coaching mensual",
          amount_cents: c.subscription.amount,
          current_period_end: `${iso(c.renewalOffset)}T23:59:59Z`,
        })
        .select("id")
        .single(),
      "suscripción",
    );
    await must(
      admin.from("payments").insert(
        c.payments.map((p) => ({
          client_id: clientId,
          subscription_id: (sub as { id: string }).id,
          provider: "manual",
          amount_cents: p.amount,
          status: p.status,
          description: "Coaching mensual",
          paid_at: p.status === "succeeded" ? ts(p.offset, 17) : null,
          created_at: ts(p.offset, 17),
        })),
      ),
      "pagos",
    );

    console.log(`✔ ${c.first} ${c.last}`);
  }

  // Solo los check-ins de los últimos 3 días quedan como alertas sin leer
  await must(
    admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", coachId).lt("created_at", ts(-3, 0)),
    "marcar alertas antiguas",
  );

  console.log(`\nListo. Contraseña de todas las cuentas demo: ${PASSWORD}`);
  console.log(`Coach:    coach@${DOMAIN}`);
  console.log(`Clientes: ${CLIENTS.map((c) => `${c.key}@${DOMAIN}`).join(", ")}`);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
