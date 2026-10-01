import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y condiciones" };

// Estructura base. El texto final debe revisarlo un profesional legal.
export default function TermsPage() {
  return (
    <>
      <h1>Términos y condiciones</h1>
      <p className="eyebrow">Borrador · pendiente de revisión legal</p>

      <h2>1. El servicio</h2>
      <p>Alpha Prime Nutrition ofrece coaching nutricional y de entrenamiento personalizado a través de esta plataforma.</p>

      <h2>2. No es atención médica</h2>
      <p>
        Los planes y cálculos son herramientas de apoyo revisadas por tu coach y no sustituyen la valoración de un
        profesional de la salud. Consultá a tu médico ante cualquier condición de salud.
      </p>

      <h2>3. Membresía y pagos</h2>
      <p>[Precio, periodicidad, renovación automática, periodo de gracia, política de cancelación y reembolsos].</p>

      <h2>4. Acceso</h2>
      <p>
        Mientras tu membresía esté activa tenés acceso completo a tu plan. Si vence y termina el periodo de gracia, el
        acceso a tu plan se pausa hasta que renueves. Tus datos no se eliminan.
      </p>

      <h2>5. Uso de la cuenta</h2>
      <p>La cuenta es personal. No compartás tu contraseña.</p>

      <h2>6. Contacto</h2>
      <p>[Correo de contacto].</p>
    </>
  );
}
