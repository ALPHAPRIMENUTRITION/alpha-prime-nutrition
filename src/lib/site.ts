// Datos públicos de la página de presentación. Cambiá aquí y se actualiza todo.
export const SITE = {
  coachName: "Carlos Aguilar",
  coachPhoto: "https://ppoceeqwopyppjraoqec.supabase.co/storage/v1/object/public/avatars/31fc3d56-05e2-4544-99dc-134a058fa307/abe17cee-1439-4a39-9dd9-289795752452.webp",
  /** WhatsApp con código de país, solo números (ej. 50370001234). Vacío = pendiente. */
  whatsapp: "",
  whatsappText: "Hola Carlos, vi tu página y quiero empezar mi plan con Alpha Prime.",
  instagram: "", // usuario sin @
};

export function whatsappUrl(text = SITE.whatsappText) {
  return SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : null;
}
