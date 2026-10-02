// Convierte filas de audit_logs en frases legibles:
// "Carlos Aguilar actualizó Peso de 84 kg a 83 kg"

const ENTITY: Record<string, { label: string; article: string }> = {
  clients: { label: "los datos del cliente", article: "" },
  client_profiles: { label: "el perfil", article: "" },
  measurements: { label: "una medición", article: "" },
  body_composition: { label: "la composición corporal", article: "" },
  nutrition_plans: { label: "el plan nutricional", article: "" },
  workout_plans: { label: "la rutina", article: "" },
  subscriptions: { label: "la membresía", article: "" },
  checkins: { label: "un check-in", article: "" },
  plan_supplements: { label: "un suplemento", article: "" },
  nutrition_day_types: { label: "el tipo de día", article: "" },
};

const FIELD: Record<string, { label: string; unit?: string }> = {
  first_name: { label: "Nombre" },
  last_name: { label: "Apellido" },
  email: { label: "Correo" },
  phone: { label: "Teléfono" },
  goal: { label: "Objetivo" },
  status: { label: "Estado" },
  start_date: { label: "Fecha de inicio" },
  renewal_date: { label: "Fecha de renovación" },
  payment_link: { label: "Link de pago" },
  has_nutrition: { label: "Incluye nutrición" },
  has_training: { label: "Incluye entrenamiento" },
  payment_amount_cents: { label: "Monto mensual" },
  user_id: { label: "Cuenta de acceso" },
  birth_date: { label: "Fecha de nacimiento" },
  sex: { label: "Sexo" },
  height_cm: { label: "Altura", unit: "cm" },
  measured_at: { label: "Fecha" },
  weight_kg: { label: "Peso", unit: "kg" },
  body_fat_pct: { label: "% grasa", unit: "%" },
  neck_cm: { label: "Cuello", unit: "cm" },
  shoulders_cm: { label: "Hombros", unit: "cm" },
  chest_cm: { label: "Pecho", unit: "cm" },
  arm_cm: { label: "Brazo", unit: "cm" },
  waist_cm: { label: "Cintura", unit: "cm" },
  hip_cm: { label: "Cadera", unit: "cm" },
  thigh_cm: { label: "Muslo", unit: "cm" },
  calf_cm: { label: "Pantorrilla", unit: "cm" },
  target_kcal: { label: "Calorías", unit: "kcal" },
  target_protein_g: { label: "Proteína", unit: "g" },
  target_carbs_g: { label: "Carbohidratos", unit: "g" },
  target_fat_g: { label: "Grasas", unit: "g" },
  coach_adherence_override: { label: "Adherencia revisada", unit: "%" },
  coach_feedback: { label: "Comentario del coach" },
  current_period_end: { label: "Fin del periodo" },
  name: { label: "Nombre" },
  weeks: { label: "Semanas" },
  is_active: { label: "Plan activo" },
  notes: { label: "Notas" },
  dose: { label: "Dosis" },
  timing: { label: "Momento" },
  frequency: { label: "Frecuencia" },
};

const HIDDEN = new Set(["client_id", "coach_id", "created_by", "extra", "calculation", "adherence_score", "reviewed_at", "submitted_at", "stripe_customer_id", "stripe_subscription_id", "plan_id", "position", "periodization"]);

const VALUE_TEXT: Record<string, string> = {
  active: "activo", suspended: "suspendido", male: "masculino", female: "femenino", other: "otro",
  submitted: "enviado", reviewed: "revisado", past_due: "pago fallido", canceled: "cancelada",
};

function fmt(field: string, v: unknown) {
  if (v === null || v === undefined || v === "") return "vacío";
  if (field === "user_id") return "vinculada";
  if (field === "payment_amount_cents" && typeof v === "number") return `US$ ${(v / 100).toFixed(2)}`;
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (typeof v === "string" && VALUE_TEXT[v]) return VALUE_TEXT[v];
  const unit = FIELD[field]?.unit;
  if (typeof v === "number") return `${v.toLocaleString("es-SV")}${unit ? ` ${unit}` : ""}`;
  const s = String(v);
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
}

export interface AuditRow {
  id: number;
  actor_name: string | null;
  entity: string;
  action: "insert" | "update" | "delete";
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

export function describeAudit(row: AuditRow) {
  const who = row.actor_name || "Sistema";
  const ent = ENTITY[row.entity]?.label ?? row.entity;
  if (row.action === "insert") {
    const named = row.entity === "nutrition_plans" || row.entity === "workout_plans" || row.entity === "plan_supplements" || row.entity === "nutrition_day_types";
    const n = named && row.changes.name?.new ? ` "${String(row.changes.name.new)}"` : "";
    const verb = row.entity === "plan_supplements" ? "pautó" : "creó";
    return { title: `${who} ${verb} ${ent}${n}`, details: [] as string[] };
  }
  if (row.action === "delete") {
    const n = (row.entity === "plan_supplements" || row.entity === "nutrition_day_types") && row.changes.name?.old ? ` "${String(row.changes.name.old)}"` : "";
    return { title: `${who} eliminó ${ent}${n}`, details: [] as string[] };
  }

  const details = Object.entries(row.changes)
    .filter(([k]) => !HIDDEN.has(k))
    .map(([k, c]) => `${FIELD[k]?.label ?? k}: ${fmt(k, c.old)} → ${fmt(k, c.new)}`);
  return { title: `${who} actualizó ${ent}`, details };
}
