import { ArrowDown, ArrowUp, Minus, Trash2 } from "lucide-react";
import type { MeasurementRow } from "@/lib/anthropometry";
import { firstLast, series } from "@/lib/anthropometry";
import { formatDate } from "@/lib/format";
import { MEASUREMENT_FIELDS } from "@/lib/validation/client";
import type { ProgressPhoto } from "@/lib/data/progress";
import { Card } from "@/components/ui";
import { LineChart } from "@/components/charts/line-chart";
import { ConfirmButton } from "@/components/confirm-button";
import { deletePhotoAction } from "@/app/coach/clientes/actions";
import { withWeightInLb } from "@/lib/units";
import { snapshotsByDate } from "@/lib/comparison";
import { Comparison } from "@/components/progress/comparison";

const POSE: Record<ProgressPhoto["pose"], string> = { front: "Frente", side: "Perfil", back: "Espalda", other: "Otra" };

function Delta({ diff, unit }: { diff: number; unit: string }) {
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  return (
    <span className="tnum inline-flex items-center gap-1 text-sm font-semibold text-fg">
      <Icon size={14} aria-hidden="true" />
      {diff > 0 ? "+" : ""}
      {diff} {unit}
    </span>
  );
}

/** Progreso: antes vs actual, gráficas, otras medidas y fotos. Sirve al coach y al cliente. */
export function ProgressView({
  rows: rowsKg,
  photos,
  clientId,
  canManagePhotos = false,
  uploader,
  heightCm = null,
}: {
  heightCm?: number | null;
  rows: MeasurementRow[];
  photos: ProgressPhoto[];
  clientId: string;
  canManagePhotos?: boolean;
  uploader?: React.ReactNode;
}) {
  const rows = withWeightInLb(rowsKg);
  const main = [
    { key: "weight_kg" as const, label: "Peso", unit: "lb" },
    { key: "waist_cm" as const, label: "Cintura", unit: "cm" },
    { key: "body_fat_pct" as const, label: "% grasa", unit: "%" },
  ];
  const others = MEASUREMENT_FIELDS.filter((f) => !main.some((m) => m.key === f.key))
    .map((f) => ({ ...f, fl: firstLast(rows, f.key) }))
    .filter((f) => f.fl);

  const poses = (["front", "side", "back"] as const)
    .map((pose) => {
      const list = photos.filter((p) => p.pose === pose && p.url);
      return list.length >= 2 ? { pose, before: list[0]!, now: list[list.length - 1]! } : null;
    })
    .filter(Boolean) as { pose: ProgressPhoto["pose"]; before: ProgressPhoto; now: ProgressPhoto }[];

  return (
    <div className="flex flex-col gap-6">
      <Comparison snapshots={snapshotsByDate(rowsKg, heightCm)} />
      {/* Antes vs actual */}
      <section aria-label="Inicial y actual" className="grid gap-3 sm:grid-cols-3">
        {main.map((m) => {
          const fl = firstLast(rows, m.key);
          return (
            <Card key={m.key} className="flex flex-col gap-2 p-4">
              <span className="eyebrow">{m.label}</span>
              {fl ? (
                <>
                  <div className="flex items-end justify-between gap-2">
                    <span className="tnum font-display text-4xl font-extrabold leading-none">
                      {fl.last}
                      <span className="ml-1 text-base text-muted">{m.unit}</span>
                    </span>
                    {fl.count > 1 && <Delta diff={fl.diff} unit={m.unit} />}
                  </div>
                  <span className="tnum text-xs text-faint">
                    Inicial {fl.first} {m.unit} · {formatDate(fl.firstDate, true)}
                  </span>
                </>
              ) : (
                <span className="text-sm text-faint">Sin registros</span>
              )}
            </Card>
          );
        })}
      </section>

      {/* Gráficas */}
      <section aria-label="Evolución" className="grid gap-4 lg:grid-cols-3">
        {main.map((m) => (
          <Card key={m.key} className="p-4">
            <h3 className="eyebrow mb-3">Evolución · {m.label}</h3>
            <LineChart data={series(rows, m.key)} unit={m.unit} label={m.label} />
          </Card>
        ))}
      </section>

      {others.length > 0 && (
        <Card className="p-5">
          <h3 className="eyebrow mb-3">Otras medidas</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-faint">
                  <th className="py-2 font-medium">Medida</th>
                  <th className="py-2 font-medium">Inicial</th>
                  <th className="py-2 font-medium">Actual</th>
                  <th className="py-2 font-medium">Cambio</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {others.map((o) => (
                  <tr key={o.key} className="border-t border-line">
                    <td className="py-2 font-medium">{o.label}</td>
                    <td className="py-2 text-muted">{o.fl!.first} {o.unit}</td>
                    <td className="py-2">{o.fl!.last} {o.unit}</td>
                    <td className="py-2">{o.fl!.count > 1 ? <Delta diff={o.fl!.diff} unit={o.unit} /> : <span className="text-faint">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Fotos */}
      <section aria-labelledby="fotos-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="fotos-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">Fotos de progreso</h3>
          {uploader}
        </div>

        {poses.map(({ pose, before, now }) => (
          <Card key={pose} className="p-4">
            <p className="eyebrow mb-3">Antes vs actual · {POSE[pose]}</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ p: before, t: "Antes" }, { p: now, t: "Actual" }].map(({ p, t }) => (
                <figure key={p.id} className="m-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url!} alt={`${t}, ${POSE[pose]}, ${formatDate(p.taken_at)}`} className="aspect-[3/4] w-full rounded-xl object-cover" />
                  <figcaption className="mt-1.5 flex justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider">{t}</span>
                    <span className="text-faint">{formatDate(p.taken_at)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Card>
        ))}

        {photos.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...photos].reverse().map((p) => (
              <figure key={p.id} className="m-0 overflow-hidden rounded-xl border border-line bg-panel">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`${POSE[p.pose]}, ${formatDate(p.taken_at)}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center text-xs text-faint">No disponible</div>
                )}
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span>
                    <span className="font-semibold">{POSE[p.pose]}</span> · <span className="text-faint">{formatDate(p.taken_at, true)}</span>
                  </span>
                  {canManagePhotos && (
                    <ConfirmButton
                      action={deletePhotoAction.bind(null, clientId, p.id)}
                      label={<Trash2 size={14} aria-label="Eliminar foto" />}
                      confirmText="¿Eliminar?"
                      confirmLabel="Sí"
                      size="xs"
                    />
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <Card className="px-6 py-10 text-center text-sm text-muted">Todavía no hay fotos de progreso.</Card>
        )}
      </section>
    </div>
  );
}
