// Mensajes rápidos de WhatsApp para responder solicitudes.
// Variables: {nombre} {objetivo} {servicio} {evaluacion} {horario}

export type TemplateService = "nutrition" | "training" | "both" | "personal";
/** service vacío = sirve para todos los servicios */
export type MessageTemplate = { title: string; body: string; service?: TemplateService };

export const TEMPLATE_SERVICES: { value: TemplateService | ""; label: string }[] = [
  { value: "", label: "Todos los servicios" },
  { value: "nutrition", label: "Alimentación" },
  { value: "training", label: "Entrenamiento online" },
  { value: "both", label: "Completo" },
  { value: "personal", label: "Personal 1 a 1" },
];

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
    title: "Info y precio · Alimentación",
    service: "nutrition",
    body: "Así funciona el plan de alimentación, {nombre}:\n\n✅ Evaluación inicial (online o presencial)\n✅ Plan hecho a tu medida según tus gustos, horarios y objetivo\n✅ Opciones para cada comida, todo en tu app Alpha Prime\n✅ Check-in cada semana y ajustes según tu progreso\n✅ Tus dudas directo conmigo por el chat de la app\n\n💰 Inversión: $[PRECIO] al mes\n\n¿Te gustaría empezar?",
  },
  {
    title: "Info y precio · Entrenamiento",
    service: "training",
    body: "Así funciona el entrenamiento online, {nombre}:\n\n✅ Rutina hecha para vos según tu nivel, tus días disponibles y dónde entrenás (gym o casa)\n✅ En la app ves cada ejercicio con series, repeticiones y descansos\n✅ Registrás tus pesos y la rutina progresa semana a semana\n✅ Check-in semanal y ajustes según cómo te vaya\n\n💰 Inversión: $[PRECIO] al mes\n\n¿Te gustaría empezar?",
  },
  {
    title: "Info y precio · Completo",
    service: "both",
    body: "El plan completo es el que más resultados da, {nombre} 🔥\n\n✅ Evaluación inicial (online o presencial)\n✅ Plan de alimentación a tu medida\n✅ Rutina de entrenamiento con progresión semana a semana\n✅ Todo en tu app Alpha Prime: comidas, rutina, check-ins y progreso\n✅ Check-in semanal y ajustes de los dos planes\n✅ Tus dudas directo conmigo por el chat de la app\n\n💰 Inversión: $[PRECIO] al mes\n\n¿Te gustaría empezar?",
  },
  {
    title: "Info y precio · Personal 1 a 1",
    service: "personal",
    body: "¡Hola {nombre}! Así funciona el entrenamiento personal 1 a 1:\n\n✅ Sesiones de 1 hora conmigo, de lunes a viernes\n✅ Te corrijo la técnica en cada ejercicio\n✅ Tu rutina y tu progreso quedan registrados en la app\n🕒 Me dijiste que preferís entrenar {horario}\n📍 Lugar: [GIMNASIO / DIRECCIÓN]\n\n💰 Inversión: $[PRECIO] al mes ([X] sesiones por semana)\n\n¿Qué días te quedarían bien para empezar?",
  },
  {
    title: "Agendar evaluación",
    body: "¡Perfecto, {nombre}! Agendemos tu evaluación {evaluacion}. ¿Qué día y hora te quedan mejor esta semana?",
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

const SERVICE_KEYS = new Set(["nutrition", "training", "both", "personal"]);

export function normalizeTemplates(raw: unknown): MessageTemplate[] {
  if (!Array.isArray(raw)) return DEFAULT_TEMPLATES;
  const list = raw
    .filter((t): t is MessageTemplate => !!t && typeof t.title === "string" && typeof t.body === "string")
    .map((t) => ({
      title: t.title.slice(0, 60),
      body: t.body.slice(0, 1500),
      ...(t.service && SERVICE_KEYS.has(t.service) ? { service: t.service } : {}),
    }))
    .slice(0, 20);
  return list.length ? list : DEFAULT_TEMPLATES;
}

/** Mensajes que aplican a una solicitud: los de su servicio primero, después los generales (con su índice original). */
export function templatesFor(list: MessageTemplate[], service: string | null) {
  const withIdx = list.map((t, idx) => ({ ...t, idx }));
  const own = withIdx.filter((t) => t.service && t.service === service);
  const general = withIdx.filter((t) => !t.service);
  // El primer contacto (primer general) va siempre primero
  return [...general.slice(0, 1), ...own, ...general.slice(1)];
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
