"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteFoodAction } from "@/app/coach/planes/actions";
import { normalize, unitLabel, type Food } from "@/lib/nutrition/plan";
import { Badge, Button, Card, Input } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { FoodForm } from "@/components/nutrition/food-form";
import { cn } from "@/lib/cn";

/** Catálogo: alimentos base (solo lectura) y propios (editables). */
export function FoodCatalog({ initial }: { initial: Food[] }) {
  const [foods, setFoods] = useState(initial);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "mine" | "base">("all");
  const [editing, setEditing] = useState<Food | "new" | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const t = normalize(q);
    return foods
      .filter((f) => (scope === "mine" ? f.coach_id : scope === "base" ? !f.coach_id : true))
      .filter((f) => !t || normalize(f.name).includes(t) || normalize(f.category ?? "").includes(t))
      .sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name));
  }, [foods, q, scope]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento o categoría" className="pl-10" aria-label="Buscar alimento" />
        </div>
        <Button type="button" onClick={() => setEditing("new")}>
          <Plus size={16} /> Nuevo alimento
        </Button>
      </div>
      <div className="flex gap-2">
        {([["all", "Todos"], ["mine", "Míos"], ["base", "Catálogo base"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setScope(k)} aria-pressed={scope === k} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", scope === k ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}>
            {l}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-2.5 text-sm text-bad">{error}</p>}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-faint">
                {["Alimento", "Porción", "Kcal", "Proteína", "Carbos", "Grasas", "Fibra", ""].map((hd) => (
                  <th key={hd} scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">{hd}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum">
              {list.map((f) => (
                <tr key={f.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{f.name}</span>
                    <span className="ml-2 text-xs text-faint">{f.category}</span>
                    {f.coach_id && <Badge className="ml-2">Propio</Badge>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{f.reference_amount} {unitLabel(f.unit, f.reference_amount)}</td>
                  <td className="px-3 py-2.5">{f.kcal}</td>
                  <td className="px-3 py-2.5">{f.protein_g} g</td>
                  <td className="px-3 py-2.5">{f.carbs_g} g</td>
                  <td className="px-3 py-2.5">{f.fat_g} g</td>
                  <td className="px-3 py-2.5 text-muted">{f.fiber_g} g</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {f.coach_id &&
                      (confirm === f.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-muted">¿Eliminar?</span>
                          <button
                            type="button"
                            disabled={pending}
                            className="rounded-full bg-bad/90 px-3 py-1 text-xs font-semibold text-white"
                            onClick={() =>
                              start(async () => {
                                const res = await deleteFoodAction(f.id);
                                setConfirm(null);
                                if (!res.ok) return setError(res.error);
                                setError(null);
                                setFoods((l) => l.filter((x) => x.id !== f.id));
                              })
                            }
                          >
                            Sí
                          </button>
                          <button type="button" className="text-xs text-muted" onClick={() => setConfirm(null)}>No</button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-1">
                          <button type="button" onClick={() => setEditing(f)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg" aria-label={`Editar ${f.name}`}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" onClick={() => setConfirm(f.id)} className="grid h-8 w-8 place-items-center rounded-full text-bad hover:bg-bad/10" aria-label={`Eliminar ${f.name}`}>
                            <Trash2 size={15} />
                          </button>
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted">No hay alimentos que coincidan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-faint">
        Catálogo base: valores aproximados por porción de referencia (tablas USDA FoodData Central). Para productos de marca, creá el alimento con los datos de su etiqueta.
      </p>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo alimento" : "Editar alimento"} wide>
        {editing !== null && (
          <FoodForm
            key={editing === "new" ? "new" : editing.id}
            food={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              setFoods((l) => (l.some((x) => x.id === saved.id) ? l.map((x) => (x.id === saved.id ? saved : x)) : [...l, saved]));
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
