import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

// Estructura base. El texto final debe revisarlo un profesional legal
// según la legislación aplicable al negocio.
export default function PrivacyPage() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="eyebrow">Borrador · pendiente de revisión legal</p>

      <h2>1. Responsable</h2>
      <p>[Nombre legal del negocio], [dirección], [correo de contacto].</p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>Datos personales: nombre, correo, teléfono, fecha de nacimiento y sexo.</li>
        <li>Datos corporales: peso, medidas, composición corporal y fotografías de progreso.</li>
        <li>Información de nutrición, entrenamiento y check-ins semanales.</li>
        <li>Datos de membresía y pagos. Los datos de tarjeta los procesa el proveedor de pagos; no se guardan en esta plataforma.</li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <p>Para prestar el servicio de coaching personalizado, dar seguimiento a tu progreso y gestionar tu membresía.</p>

      <h2>4. Quién puede verlos</h2>
      <p>Solo vos y tu coach. Ningún otro cliente puede acceder a tu información. Las fotografías se guardan en almacenamiento privado.</p>

      <h2>5. Conservación</h2>
      <p>[Plazo de conservación]. Si tu membresía vence, tus datos se conservan para que podás retomar el programa.</p>

      <h2>6. Tus derechos</h2>
      <p>Podés pedir acceso, corrección, exportación o eliminación de tus datos escribiendo a [correo de contacto].</p>

      <h2>7. Cambios</h2>
      <p>Te avisaremos dentro de la aplicación si esta política cambia. Última actualización: [fecha].</p>
    </>
  );
}
