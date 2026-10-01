import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listExercises } from "@/lib/data/training";
import { ExerciseCatalog } from "@/components/training/exercise-catalog";

export const metadata: Metadata = { title: "Ejercicios" };

export default async function ExercisesPage() {
  await requireRole("coach");
  const exercises = await listExercises();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/coach/rutinas" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Rutinas
      </Link>
      <header>
        <p className="eyebrow">Entrenamiento</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Ejercicios</h1>
        <p className="mt-2 text-sm text-muted">Catálogo base más tus ejercicios propios. Los propios solo los ves vos y tus clientes.</p>
      </header>
      <ExerciseCatalog initial={exercises} />
    </div>
  );
}
