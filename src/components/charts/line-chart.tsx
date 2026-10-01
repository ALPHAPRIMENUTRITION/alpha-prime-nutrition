import { formatDate } from "@/lib/format";

/**
 * Gráfica de evolución (una serie). SVG del servidor, sin librerías.
 * Línea 2px, área tenue, grid recesivo, último punto destacado con su valor,
 * y áreas de hover por punto (tooltip nativo) más grandes que el marcador.
 */
export function LineChart({
  data,
  unit,
  label,
  height = 210,
}: {
  data: { date: string; value: number }[];
  unit: string;
  label: string;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="grid h-[140px] place-items-center rounded-xl border border-dashed border-line text-center text-sm text-faint">
        {data.length === 1 ? `Un solo registro: ${data[0]!.value} ${unit}. La gráfica aparece con dos o más.` : "Sin registros todavía."}
      </div>
    );
  }

  const W = 440, H = height, L = 46, R = 70, T = 16, B = 30;
  const vals = data.map((d) => d.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const pad = (max - min) * 0.15;
  min -= pad; max += pad;

  const t0 = Date.parse(data[0]!.date), t1 = Date.parse(data[data.length - 1]!.date);
  // Escala temporal; si todo cae el mismo día, se reparte por orden.
  const byIndex = t1 === t0;
  const idx = new Map(data.map((d, i) => [d, i]));
  const xOf = (d: { date: string }) =>
    L + (byIndex ? (idx.get(d as never) ?? 0) / (data.length - 1) : (Date.parse(d.date) - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + ((max - v) / (max - min)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  const decimals = max - min < 6 ? 1 : 0;

  const line = data.map((d, i) => `${i ? "L" : "M"}${xOf(d).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${xOf(data[data.length - 1]!).toFixed(1)},${H - B} L${L},${H - B} Z`;
  const last = data[data.length - 1]!;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${label}: de ${data[0]!.value} a ${last.value} ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#2a2a31" strokeWidth="1" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="14" fill="#6b6b75" className="tnum">
              {t.toFixed(decimals)}
            </text>
          </g>
        ))}
        <text x={L} y={H - 6} fontSize="14" fill="#6b6b75">{formatDate(data[0]!.date, true)}</text>
        <text x={W - R} y={H - 6} fontSize="14" fill="#6b6b75" textAnchor="end">{formatDate(last.date, true)}</text>

        <path d={area} fill="#e3242f" opacity="0.08" />
        <path d={line} fill="none" stroke="#e3242f" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          return (
            <g key={d.date + i}>
              <circle cx={xOf(d)} cy={y(d.value)} r={isLast ? 5 : 3} fill={isLast ? "#e3242f" : "#18181c"} stroke="#e3242f" strokeWidth="2" />
              <circle cx={xOf(d)} cy={y(d.value)} r="12" fill="transparent">
                <title>{`${formatDate(d.date)}: ${d.value} ${unit}`}</title>
              </circle>
            </g>
          );
        })}
        <text x={xOf(last) + 9} y={y(last.value) + 4} fontSize="15" fontWeight="700" fill="#f3f3f4" className="tnum">
          {last.value} {unit}
        </text>
      </svg>
      <figcaption className="sr-only">
        {data.map((d) => `${formatDate(d.date)}: ${d.value} ${unit}`).join("; ")}
      </figcaption>
    </figure>
  );
}
