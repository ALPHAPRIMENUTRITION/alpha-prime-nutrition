import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_COLS, type PaymentRow } from "@/lib/payments";

// Consultas con la sesión del usuario: RLS limita a los pagos de sus clientes
// (coach) o a los propios (cliente).

export interface CoachPaymentSettings {
  payment_link: string | null;
  payment_plan_name: string | null;
  payment_amount_cents: number | null;
  payment_instructions: string | null;
}

export async function getCoachPaymentSettings(coachId: string): Promise<CoachPaymentSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coaches")
    .select("payment_link, payment_plan_name, payment_amount_cents, payment_instructions")
    .eq("id", coachId)
    .maybeSingle();
  return data ?? { payment_link: null, payment_plan_name: null, payment_amount_cents: null, payment_instructions: null };
}

export type PaymentWithClient = PaymentRow & { client_name: string };

async function withNames(rows: PaymentRow[]): Promise<PaymentWithClient[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const ids = [...new Set(rows.map((r) => r.client_id))];
  const { data } = await supabase.from("clients").select("id, first_name, last_name").in("id", ids);
  const names = new Map((data ?? []).map((c) => [c.id, `${c.first_name} ${c.last_name}`.trim()]));
  return rows.map((r) => ({ ...r, client_name: names.get(r.client_id) ?? "Cliente" }));
}

export async function listPendingPayments() {
  const supabase = await createClient();
  const { data } = await supabase.from("payments").select(PAYMENT_COLS).eq("status", "pending").order("created_at");
  return withNames((data ?? []) as PaymentRow[]);
}

export async function listRecentPayments(limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select(PAYMENT_COLS)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  return withNames((data ?? []) as PaymentRow[]);
}

export async function getClientPayments(clientId: string, limit = 36) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select(PAYMENT_COLS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PaymentRow[];
}

export interface MyPaymentInfo {
  link: string | null;
  amount_cents: number | null;
  plan_name: string | null;
  instructions: string | null;
  pending: boolean;
}

export async function getMyPaymentInfo(): Promise<MyPaymentInfo> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_payment_info");
  const d = (data ?? {}) as Partial<MyPaymentInfo>;
  return {
    link: d.link ?? null,
    amount_cents: d.amount_cents ?? null,
    plan_name: d.plan_name ?? null,
    instructions: d.instructions ?? null,
    pending: Boolean(d.pending),
  };
}
