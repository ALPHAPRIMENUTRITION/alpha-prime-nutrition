"use client";

import { Button } from "@/components/ui";

/** Error de una sección: no muestra detalles técnicos al usuario. */
export function SectionError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card border border-line bg-panel px-6 py-14 text-center">
      <p className="font-display text-2xl font-extrabold uppercase">No pudimos cargar esta sección</p>
      <p className="max-w-sm text-sm text-muted">Revisá tu conexión e intentá de nuevo. Si el problema sigue, avisale a soporte.</p>
      <Button variant="secondary" onClick={reset} className="mt-2">
        Reintentar
      </Button>
    </div>
  );
}
