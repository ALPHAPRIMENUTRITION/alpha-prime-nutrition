import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // Solo en este aparato: no cierra la sesión del celular o la compu del mismo usuario
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
