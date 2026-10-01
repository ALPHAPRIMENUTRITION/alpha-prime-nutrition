"use client";

import { useEffect } from "react";

/**
 * Si un link de invitación termina en la página de login (p. ej. cuando la
 * URL de redirección no está permitida en Supabase), lo pasa a /auth/aceptar.
 */
export function AuthHashRedirect() {
  useEffect(() => {
    const h = window.location.hash;
    if (/access_token=|error_description=/.test(h)) window.location.replace("/auth/aceptar" + h);
  }, []);
  return null;
}
