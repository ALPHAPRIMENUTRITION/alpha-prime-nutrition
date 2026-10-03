// Mensajes rápidos de WhatsApp para responder solicitudes.
// Variables: {nombre} {objetivo} {servicio} {evaluacion} {horario}

export type MessageTemplate = { title: string; body: string };

export const TEMPLATE_VARS = [
  { key: "{nombre}", hint: "Andrea" },
  { key: "{objetivo}", hint: "bajar grasa" },
  { key: "{servicio}", hint: "el plan completo (alimentación + entrenamiento)" },
  { key: "{evaluacion}", hint: "online" },
  { key: "{horario}", hint: "en la noche (5 a 9 p. m.)" },
] as const;

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    title: "Primer contacto",
    body: "¡Hola {nombre}! 👋 Soy Carlos de Alpha Prime. Recibí tu solicitud para {servicio} con el objetivo de {objetivo}. ¡Con gusto te ayudo!\n\n¿Tenés unos minutos para contarte cómo funciona?",
  },
  {
    title: "Cómo funciona y precio",
    body: "Así funciona {servicio}:\n\n✅ Evaluación inicial (online o presencial)\n✅ Plan hecho a tu medida en la app Alpha Prime\n✅ Check-in cada semana y ajustes según tu progreso\n✅ Comunicación directa conmigo por WhatsApp\n\n💰 Inversión: $[PRECIO] al mes\n\n¿Te gustaría empezar, {nombre}?",
  },
  {
    title: "Agendar evaluación",
    body: "¡Perfecto, {nombre}! Agendemos tu evaluación {evaluacion}. ¿Qué día y hora te quedan mejor esta semana?",
  },
  {
    title: "Personal 1 a 1: horarios",
    body: "¡Hola {nombre}! Las sesiones de entrenamiento personal son de 1 hora, de lunes a viernes. Me dijiste que preferís entrenar {horario}. ¿Qué días te gustaría empezar?",
  },
  {
    title: "Datos de pago",
    body: "¡Excelente decisión, {nombre}! 🔥 Para reservar tu lugar podés pagar aquí: [LINK DE PAGO]\n\nApenas lo confirme te mando tu acceso a la app y un cuestionario para armar tu plan.",
  },
  {
    title: "Seguimiento",
    body: "¡Hola {nombre}! ¿Pudiste ver la información que te mandé? Si tenés cualquier duda, con gusto te la resuelvo 💪",
  },
];

export function normalizeTemplates(raw: unknown): MessageTemplate[] {
  if (!Array.isArray(raw)) return DEFAULT_TEMPLATES;
  const list = raw
    .filter((t): t is MessageTemplate => !!t && typeof t.title === "string" && typeof t.body === "string")
    .map((t) => ({ title: t.title.slice(0, 60), body: t.body.slice(0, 1500) }))
    .slice(0, 15);
  return list.length ? list : DEFAULT_TEMPLATES;
}

/** "CARLOS ernesto" → "Carlos Ernesto" */
export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((w) => (w.trim() ? w.charAt(0).toLocaleUpperCase("es") + w.slice(1) : w))
    .join("");
}

const SERVICE_TEXT: Record<string, string> = {
  nutrition: "un plan de alimentación",
  training: "una rutina de entrenamiento online",
  both: "el plan completo (alimentación + entrenamiento)",
  personal: "entrenamiento personal 1 a 1",
};

export type TemplateData = {
  first_name: string;
  goal: string | null;
  service: string | null;
  answers: Record<string, string | string[]>;
};

export function templateVars(d: TemplateData): Record<string, string> {
  const goal = d.goal && d.goal !== "Otro" ? d.goal.toLowerCase().replace(/\bmis\b/g, "tus").replace(/\bmi\b/g, "tu") : "lo que buscás";
  const ev = String(d.answers.evaluation ?? "");
  const horario = String(d.answers.training_time ?? "");
  return {
    "{nombre}": titleCase(d.first_name.trim()),
    "{objetivo}": goal,
    "{servicio}": (d.service && SERVICE_TEXT[d.service]) || "tu plan",
    "{evaluacion}": ev.startsWith("Online") ? "online" : ev === "Presencial" ? "presencial" : "(online o presencial, como prefirás)",
    "{horario}": horario ? horarioText(horario) : "en el horario que te quede mejor",
  };
}

/** "Noche (5 a 9 p. m.)" → "en la noche (5 a 9 p. m.)" */
function horarioText(h: string) {
  const [word, ...rest] = h.split(" (");
  const range = rest.length ? ` (${rest.join(" (")}` : "";
  const w = (word ?? "").toLowerCase();
  return (w === "temprano" ? "temprano" : `en la ${w}`) + range;
}

export function fillTemplate(body: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(k).join(v), body);
}
