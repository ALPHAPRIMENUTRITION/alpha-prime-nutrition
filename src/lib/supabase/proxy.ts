import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

const PROTECTED_PREFIXES = ["/coach", "/portal"];

/**
 * Refresca la sesión en cada petición y bloquea rutas privadas sin sesión.
 * El control de ROL se hace en los layouts del servidor y, sobre todo, en
 * la base de datos (RLS); esto es solo la primera barrera.
 */
export async function updateSession(request: NextRequest) {
  const env = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims valida el JWT; no confiar en getSession() en el servidor.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!isSignedIn && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return copyCookies(response, NextResponse.redirect(url));
  }

  // Ojo: no se redirige desde /login acá. Un token puede ser válido pero su sesión
  // ya cerrada (p. ej. cerró sesión en otro aparato); eso lo detecta getUser() en la
  // página de login. Redirigir aquí causaba un bucle /login ↔ /coach.

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}
