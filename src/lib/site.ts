// Datos públicos de la página de presentación. Cambiá aquí y se actualiza todo.
export const SITE = {
  coachName: "Carlos Aguilar",
  coachPhoto: "/landing/carlos.webp",
  /** WhatsApp con código de país, solo números (ej. 50370001234). Vacío = pendiente. */
  whatsapp: "50377684814",
  whatsappText: "Hola Carlos, vi tu página y quiero empezar mi plan con Alpha Prime.",
  instagram: "carlosernestoaguilar", // usuario sin @
};

export function whatsappUrl(text = SITE.whatsappText) {
  return SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : null;
}

/**
 * Testimonios reales (con permiso del cliente). Mientras la lista esté vacía, la sección no se muestra.
 * Fotos: subirlas a public/landing/ y poner la ruta, p. ej. "/landing/ana-antes.webp".
 */
export const TESTIMONIALS: { name: string; text: string; result?: string; before?: string; after?: string }[] = [];

/** Link de WhatsApp a un número de cliente (8 dígitos = El Salvador). */
export function waTo(phone: string | null | undefined, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const to = digits.length === 8 ? "503" + digits : digits;
  return `https://wa.me/${to.length >= 8 ? to : ""}?text=${encodeURIComponent(text)}`;
}

/** Número con código de país (8 dígitos = El Salvador). */
export function waNumber(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length === 8 ? "503" + digits : digits;
}

/** Abre la app de WhatsApp directo (celular). Evita la página intermedia y el problema de los emojis. */
export function waAppUrl(phone: string | null | undefined, text: string) {
  const to = waNumber(phone);
  return `whatsapp://send?${to.length >= 8 ? `phone=${to}&` : ""}text=${encodeURIComponent(text)}`;
}

/** Versión web (computadora). */
export function waWebUrl(phone: string | null | undefined, text: string) {
  const to = waNumber(phone);
  return `https://api.whatsapp.com/send?${to.length >= 8 ? `phone=${to}&` : ""}text=${encodeURIComponent(text)}`;
}
