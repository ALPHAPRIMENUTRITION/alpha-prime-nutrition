import { z } from "zod";

// Variables públicas: disponibles en navegador y servidor.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

let cached: z.infer<typeof publicSchema> | null = null;

export function publicEnv() {
  if (cached) return cached;
  // Se leen de forma explícita para que Next.js las inyecte en el bundle del cliente.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      "Configuración incompleta: " + parsed.error.issues.map((i) => i.message).join("; ") +
        ". Revisá .env.local (ver .env.example).",
    );
  }
  cached = parsed.data;
  return cached;
}
