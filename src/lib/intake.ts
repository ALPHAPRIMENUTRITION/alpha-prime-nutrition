// Cuestionario inicial: una sola definición para el formulario, la validación y la vista del coach.
// Para agregar o cambiar una pregunta, se edita solo este archivo.

export type IntakeQuestion = {
  key: string;
  label: string;
  type: "text" | "textarea" | "email" | "tel" | "date" | "number" | "radio" | "checkbox" | "select" | "file";
  options?: readonly string[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  /** Solo se muestra si otra respuesta tiene cierto valor */
  showIf?: { key: string; values: readonly string[] };
  /** Ancho completo en pantallas grandes */
  wide?: boolean;
};

export type IntakeSection = { id: string; title: string; intro?: string; questions: IntakeQuestion[] };

export const GOALS = [
  "Bajar grasa",
  "Ganar masa muscular",
  "Bajar grasa y ganar músculo",
  "Mejorar mi rendimiento deportivo",
  "Mejorar mi salud y mis hábitos",
  "Otro",
] as const;

export const SERVICES = [
  "Plan de alimentación",
  "Rutina de entrenamiento online",
  "Completo (alimentación + entrenamiento)",
  "Entrenamiento personal 1 a 1 (presencial)",
] as const;

/** Servicio elegido → valor de la base (y del alta de cliente). */
export const SERVICE_VALUE: Record<(typeof SERVICES)[number], "nutrition" | "training" | "both" | "personal"> = {
  "Plan de alimentación": "nutrition",
  "Rutina de entrenamiento online": "training",
  "Completo (alimentación + entrenamiento)": "both",
  "Entrenamiento personal 1 a 1 (presencial)": "personal",
};

const SEX = ["Hombre", "Mujer"] as const;
export const SEX_VALUE: Record<string, "male" | "female"> = { Hombre: "male", Mujer: "female" };

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    id: "datos",
    title: "Tus datos",
    questions: [
      { key: "first_name", label: "Nombre", type: "text", required: true, max: 80 },
      { key: "last_name", label: "Apellido", type: "text", max: 80 },
      { key: "phone", label: "WhatsApp", type: "tel", required: true, placeholder: "7000 0000", max: 30 },
      { key: "email", label: "Correo", type: "email", placeholder: "tucorreo@gmail.com", max: 200 },
      { key: "birth_date", label: "Fecha de nacimiento", type: "date" },
      { key: "sex", label: "Sexo", type: "radio", options: SEX },
      { key: "city", label: "Ciudad y país", type: "text", placeholder: "Ej. Santa Ana, El Salvador", max: 120, wide: true },
    ],
  },
  {
    id: "objetivo",
    title: "Tu objetivo",
    questions: [
      { key: "goal", label: "¿Qué querés lograr?", type: "radio", options: GOALS, required: true, wide: true },
      { key: "goal_detail", label: "Contame más", type: "textarea", placeholder: "¿Qué te gustaría cambiar? ¿Para cuándo? ¿Lo intentaste antes?", max: 1000, wide: true },
      { key: "weight_lb", label: "Peso actual (lb)", type: "number", min: 50, max: 800, placeholder: "160" },
      { key: "height_cm", label: "Estatura (cm)", type: "number", min: 100, max: 230, placeholder: "170", hint: "Ej. 1.70 m = 170 cm" },
      { key: "target_weight_lb", label: "Peso que te gustaría tener (lb)", type: "number", min: 50, max: 800, hint: "Opcional" },
    ],
  },
  {
    id: "servicio",
    title: "Servicio",
    questions: [
      { key: "service", label: "¿Qué servicio te interesa?", type: "radio", options: SERVICES, required: true, wide: true },
      {
        key: "evaluation",
        label: "¿Cómo preferís la evaluación?",
        type: "radio",
        options: ["Online (videollamada / WhatsApp)", "Presencial", "Me da igual"],
        wide: true,
      },
      {
        key: "training_time",
        label: "¿En qué horario preferís entrenar?",
        type: "radio",
        options: ["Temprano (5 a 8 a. m.)", "Mañana (8 a 12 m.)", "Tarde (12 a 5 p. m.)", "Noche (5 a 9 p. m.)"],
        hint: "Las sesiones 1 a 1 son de 1 hora, de lunes a viernes.",
        showIf: { key: "service", values: ["Entrenamiento personal 1 a 1 (presencial)"] },
        wide: true,
      },
    ],
  },
  {
    id: "actividad",
    title: "Actividad física",
    questions: [
      { key: "trains_now", label: "¿Entrenás actualmente?", type: "radio", options: ["Sí", "No"], wide: true },
      {
        key: "activity_types",
        label: "¿Qué tipo de ejercicio hacés?",
        type: "checkbox",
        options: ["Pesas / gimnasio", "Cardio (correr, bici, caminar)", "Funcional / CrossFit", "Deporte (fútbol, básquet…)", "En casa", "Yoga / pilates", "Otro"],
        showIf: { key: "trains_now", values: ["Sí"] },
        wide: true,
      },
      {
        key: "days_per_week",
        label: "¿Cuántos días a la semana?",
        type: "select",
        options: ["1", "2", "3", "4", "5", "6", "7"],
        showIf: { key: "trains_now", values: ["Sí"] },
      },
      {
        key: "experience",
        label: "Tu experiencia entrenando",
        type: "radio",
        options: ["Principiante (menos de 6 meses)", "Intermedio (6 meses a 2 años)", "Avanzado (más de 2 años)"],
        wide: true,
      },
      { key: "train_place", label: "¿Dónde entrenás o te gustaría entrenar?", type: "checkbox", options: ["Gimnasio", "Casa", "Al aire libre"], wide: true },
      { key: "days_available", label: "¿Cuántos días podés entrenar a la semana?", type: "select", options: ["2", "3", "4", "5", "6"] },
      { key: "injuries", label: "¿Lesiones, dolores o limitaciones?", type: "textarea", placeholder: "Ej. dolor de rodilla al correr, operación de hombro…", max: 800, wide: true },
    ],
  },
  {
    id: "salud",
    title: "Salud",
    intro: "Esta información es confidencial: solo la ve tu coach y sirve para armar un plan seguro para vos.",
    questions: [
      {
        key: "conditions",
        label: "¿Tenés alguna de estas condiciones?",
        type: "checkbox",
        options: [
          "Diabetes o prediabetes",
          "Presión alta",
          "Colesterol o triglicéridos altos",
          "Problemas de tiroides",
          "Síndrome de ovario poliquístico",
          "Gastritis, colitis u otro problema digestivo",
          "Ninguna",
        ],
        wide: true,
      },
      { key: "conditions_other", label: "Otra condición o detalle", type: "text", max: 300, wide: true },
      { key: "medications", label: "¿Tomás algún medicamento? ¿Cuál?", type: "textarea", placeholder: "Nombre y para qué lo tomás. Si no, dejalo vacío.", max: 600, wide: true },
      { key: "supplements", label: "¿Tomás suplementos?", type: "text", placeholder: "Proteína, creatina, vitaminas…", max: 300, wide: true },
      { key: "allergies", label: "Alergias o intolerancias", type: "text", placeholder: "Lactosa, gluten, maní, mariscos…", max: 300, wide: true },
      {
        key: "pregnancy",
        label: "¿Estás embarazada o en lactancia?",
        type: "radio",
        options: ["No", "Embarazada", "Lactancia"],
        showIf: { key: "sex", values: ["Mujer"] },
        wide: true,
      },
    ],
  },
  {
    id: "alimentacion",
    title: "Alimentación",
    questions: [
      { key: "diet_type", label: "¿Cómo comés?", type: "radio", options: ["Como de todo", "Vegetariano", "Vegano", "Otro"], wide: true },
      { key: "meals_per_day", label: "Comidas al día", type: "select", options: ["1", "2", "3", "4", "5", "6 o más"] },
      { key: "water", label: "Agua al día", type: "select", options: ["Menos de 1 litro", "1 a 2 litros", "Más de 2 litros"] },
      { key: "likes", label: "Comidas que te gustan y no querés dejar", type: "textarea", placeholder: "Pupusas, pollo, arroz, frutas…", max: 800, wide: true },
      { key: "dislikes", label: "Alimentos que no te gustan o no comés", type: "textarea", max: 800, wide: true },
      { key: "eats_out", label: "¿Cuántas veces comés fuera de casa?", type: "radio", options: ["Casi nunca", "1 a 2 veces por semana", "3 o más veces por semana"], wide: true },
      { key: "cooks", label: "¿Quién prepara tu comida?", type: "radio", options: ["Yo", "Alguien de mi casa", "Compro comida hecha"], wide: true },
      { key: "alcohol", label: "¿Tomás alcohol?", type: "radio", options: ["No", "Ocasionalmente", "Cada fin de semana", "Varias veces por semana"], wide: true },
      { key: "prev_diets", label: "¿Has seguido alguna dieta o plan de alimentación antes?", type: "radio", options: ["Sí", "No"], wide: true },
      {
        key: "prev_diets_detail",
        label: "¿Cuál fue? ¿Qué te funcionó y por qué la dejaste?",
        type: "textarea",
        placeholder: "Ej. dieta keto por 2 meses, bajé 10 lb pero me daba mucha hambre…",
        max: 1000,
        wide: true,
        showIf: { key: "prev_diets", values: ["Sí"] },
      },
      {
        key: "prev_diet_files",
        label: "Si tenés tu plan anterior, subilo (opcional)",
        type: "file",
        hint: "Fotos o PDF, hasta 3 archivos.",
        wide: true,
        showIf: { key: "prev_diets", values: ["Sí"] },
      },
      { key: "schedule", label: "Tu horario normal", type: "textarea", placeholder: "¿A qué hora te levantás, trabajás o estudiás, y te dormís?", max: 800, wide: true },
    ],
  },
  {
    id: "estilo",
    title: "Estilo de vida",
    questions: [
      { key: "sleep", label: "¿Cuántas horas dormís?", type: "radio", options: ["Menos de 5", "5 a 6", "7 a 8", "Más de 8"], wide: true },
      { key: "stress", label: "Tu nivel de estrés", type: "radio", options: ["Bajo", "Medio", "Alto"], wide: true },
      { key: "job_activity", label: "En tu trabajo o estudio pasás…", type: "radio", options: ["Sentado la mayor parte", "De pie o caminando", "Haciendo trabajo físico pesado"], wide: true },
      { key: "comments", label: "¿Algo más que quieras contarme?", type: "textarea", max: 1500, wide: true },
    ],
  },
];

export const ALL_QUESTIONS = INTAKE_SECTIONS.flatMap((s) => s.questions);
const Q = (key: string, over: Partial<IntakeQuestion> = {}) => ({ ...ALL_QUESTIONS.find((q) => q.key === key)!, ...over });

/** Solicitud corta de la página pública: lo mínimo para escribirle y cotizar (1 minuto). */
export const SHORT_SECTIONS: IntakeSection[] = [
  {
    id: "solicitud",
    title: "Tu solicitud",
    questions: [
      Q("first_name"),
      Q("last_name"),
      Q("phone", { wide: true }),
      Q("goal"),
      Q("service"),
      Q("evaluation"),
      Q("training_time"),
      Q("goal_detail", { label: "¿Algo que quieras contarme? (opcional)", placeholder: "Ej. quiero bajar 15 lb antes de diciembre", max: 500 }),
    ],
  },
];

export type IntakeKind = "short" | "full";
export const sectionsFor = (kind: IntakeKind) => (kind === "short" ? SHORT_SECTIONS : INTAKE_SECTIONS);

/** Respuestas tal como se guardan: texto o lista de opciones. */
export type IntakeAnswers = Record<string, string | string[]>;

export function isVisible(q: IntakeQuestion, a: IntakeAnswers) {
  if (!q.showIf) return true;
  const v = a[q.showIf.key];
  return typeof v === "string" && q.showIf.values.includes(v);
}

/** Valida y limpia lo enviado. Devuelve las respuestas o los errores por campo. */
export function parseIntake(
  fd: FormData,
  kind: IntakeKind = "full",
): { ok: true; answers: IntakeAnswers } | { ok: false; errors: Record<string, string>; answers: IntakeAnswers } {
  const answers: IntakeAnswers = {};
  const errors: Record<string, string> = {};
  const QUESTIONS = sectionsFor(kind).flatMap((s) => s.questions);

  for (const q of QUESTIONS) {
    if (q.type === "file") continue;
    if (q.type === "checkbox") {
      const vals = fd.getAll(q.key).map(String).filter((v) => q.options?.includes(v));
      if (vals.length) answers[q.key] = [...new Set(vals)];
      continue;
    }
    const raw = String(fd.get(q.key) ?? "").trim().slice(0, q.max ?? 200);
    if (!raw) continue;
    answers[q.key] = raw;
  }

  for (const q of QUESTIONS) {
    const v = answers[q.key];
    if (!isVisible(q, answers)) {
      delete answers[q.key];
      continue;
    }
    if (q.required && (v == null || v === "")) {
      errors[q.key] = "Este dato es necesario.";
      continue;
    }
    if (typeof v !== "string") continue;
    if ((q.type === "radio" || q.type === "select") && !q.options?.includes(v)) {
      errors[q.key] = "Elegí una opción.";
    } else if (q.type === "number") {
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || (q.min != null && n < q.min) || (q.max != null && n > q.max)) errors[q.key] = `Escribí un número entre ${q.min} y ${q.max}.`;
      else answers[q.key] = String(n);
    } else if (q.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      errors[q.key] = "Revisá el correo.";
    } else if (q.type === "date") {
      const d = new Date(v + "T00:00:00");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime()) || d > new Date() || d.getFullYear() < 1900) errors[q.key] = "Revisá la fecha.";
    } else if (q.type === "tel" && !/^[0-9+()\-\s]{7,30}$/.test(v)) {
      errors[q.key] = "Revisá el número.";
    }
  }

  return Object.keys(errors).length ? { ok: false, errors, answers } : { ok: true, answers };
}

export function answerText(v: string | string[] | undefined) {
  if (v == null || v === "") return null;
  return Array.isArray(v) ? v.join(", ") : v;
}
