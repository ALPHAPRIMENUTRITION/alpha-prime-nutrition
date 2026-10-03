/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Bell, ClipboardList, Clock, Globe, Video, CalendarCheck, Dumbbell, LineChart, MessageCircle, Salad, Smartphone, Target, Utensils } from "lucide-react";
import { LogoHorizontal } from "@/components/brand/logo";
import { SITE, TESTIMONIALS, whatsappUrl } from "@/lib/site";
import { cn } from "@/lib/cn";

const STEPS = [
  { title: "Me dejás tu solicitud", text: "En 1 minuto me contás tu objetivo y qué servicio te interesa. Te escribo por WhatsApp." },
  { title: "Evaluación online o presencial", text: "Por videollamada desde donde estés, o en persona con medidas. Tu plan es igual de personalizado." },
  { title: "Tu plan en la app", text: "Recibís tu plan de alimentación y tu rutina, hechos para vos." },
  { title: "Seguimiento semanal", text: "Cada semana mandás tu check-in y ajustamos lo necesario." },
];

const SERVICES = [
  {
    icon: Utensils,
    name: "Alimentación",
    text: "Plan de alimentación a tu medida, con calorías y macros por día y opciones para cada comida.",
    items: ["Plan de alimentación personalizado", "Check-in semanal", "Medidas y comparativas"],
  },
  {
    icon: Dumbbell,
    name: "Entrenamiento",
    text: "Rutina por semanas con progresión. Registrás tus series y ves cómo subís de peso.",
    items: ["Rutina personalizada", "Registro de series y cargas", "Progresión semana a semana"],
  },
  {
    icon: Target,
    name: "Completo",
    text: "Alimentación y entrenamiento juntos: el camino más rápido para ver resultados.",
    items: ["Todo lo de alimentación", "Todo lo de entrenamiento", "Ajustes según tu progreso"],
    featured: true,
  },
  {
    icon: Clock,
    name: "Personal 1 a 1",
    text: "Entrenamiento presencial conmigo: técnica, motivación y progreso en cada sesión.",
    items: ["Sesiones de 1 hora", "De lunes a viernes", "Horario a convenir"],
    presencial: true,
  },
];

const FEATURES = [
  { icon: Salad, title: "Tu plan de alimentación", text: "Calorías, macros y opciones de cada comida, siempre a mano." },
  { icon: Dumbbell, title: "Tu rutina del día", text: "Marcás cada serie al terminarla y ves lo que hiciste la vez pasada." },
  { icon: CalendarCheck, title: "Check-ins semanales", text: "Peso, fotos y cómo te sentiste. Yo lo reviso y te respondo." },
  { icon: LineChart, title: "Tu progreso", text: "Peso, % de grasa, pliegues y medidas comparadas mes a mes." },
  { icon: Bell, title: "Notificaciones", text: "Te avisa cuando cambio tu plan y te recuerda tu check-in." },
  { icon: Smartphone, title: "Como una app", text: "Se instala en tu celular, sin tiendas ni descargas pesadas." },
];

function Cta({ className, label = "Quiero empezar" }: { className?: string; label?: string }) {
  const wa = whatsappUrl();
  return (
    <a
      href={wa ?? "#contacto"}
      target={wa ? "_blank" : undefined}
      rel={wa ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red px-6 text-base font-semibold text-white transition-colors hover:bg-red-hover",
        className,
      )}
    >
      <MessageCircle size={19} /> {label}
    </a>
  );
}

function Phone({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[2.2rem] border-[6px] border-[#26262c] bg-ink shadow-2xl shadow-black/60", className)}>
      <img src={src} alt={alt} width={390} height={844} className="block h-auto w-full" />
    </div>
  );
}

export function Landing() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <LogoHorizontal className="-ml-2 h-10" />
          <Link href="/login" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold hover:border-faint">
            Ya soy cliente <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Portada */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-[-20%] h-[38rem] w-[38rem] rounded-full bg-red/20 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <p className="eyebrow text-red">Asesorías online · Alimentación y entrenamiento</p>
            <h1 className="mt-4 font-display text-[3.4rem] font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-[5.5rem]">
              Tu mejor versión, <span className="text-red">con un plan hecho para vos</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Plan de alimentación y rutina personalizados, con seguimiento cada semana desde tu propia app. Sin dietas copiadas, sin adivinar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/empezar" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red px-6 text-base font-semibold text-white transition-colors hover:bg-red-hover">
                <ClipboardList size={19} /> Quiero empezar
              </Link>
              <a href="#como-funciona" className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-6 font-semibold hover:border-faint">
                Cómo funciona
              </a>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-red/40 bg-red/10 px-4 py-2 text-sm font-semibold">
              <Globe size={16} className="text-red" /> Evaluación 100 % online · No necesitás venir en persona
            </p>
          </div>

          <div className="relative mx-auto flex w-full max-w-md justify-center">
            <Phone src="/landing/app-progreso.webp" alt="Pantalla de progreso de la app" className="absolute left-0 top-10 hidden w-[52%] rotate-[-6deg] opacity-80 sm:block" />
            <Phone src="/landing/app-inicio.webp" alt="Pantalla de inicio de la app Alpha Prime" className="relative w-[64%] sm:ml-[30%]" />
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-16 border-t border-line/60 bg-graphite">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow text-red">Cómo funciona</p>
          <h2 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">4 pasos para empezar</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-card border border-line bg-panel p-5">
                <span className="font-display text-5xl font-extrabold text-red">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid gap-6 rounded-card border border-red/50 bg-gradient-to-br from-red/15 via-panel to-panel p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-red text-white">
              <Video size={30} />
            </span>
            <div>
              <h3 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">¿No podés venir en persona? <span className="text-red">No hay problema.</span></h3>
              <p className="mt-3 max-w-3xl text-muted">
                La evaluación también se hace <strong className="text-fg">100 % online</strong>: por videollamada o WhatsApp me contás tu objetivo, tu día a día y lo que te gusta comer, me mandás tu peso y unas fotos, y armo tu plan a tu medida. Estés donde estés.
                Si preferís venir, también podemos hacerla en persona y tomar tus medidas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <p className="eyebrow text-red">Servicios</p>
        <h2 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">Elegí tu plan</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((s) => (
            <article
              key={s.name}
              className={cn("relative flex flex-col rounded-card border bg-panel p-6", s.featured ? "border-red shadow-[0_0_0_1px_var(--color-red)]" : "border-line")}
            >
              {s.featured && <span className="absolute -top-3 left-6 rounded-full bg-red px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Recomendado</span>}
              {"presencial" in s && <span className="absolute -top-3 left-6 rounded-full border border-line bg-panel-2 px-3 py-1 text-xs font-bold uppercase tracking-wide">Presencial</span>}
              <s.icon size={28} className="text-red" />
              <h3 className="mt-4 font-display text-4xl font-extrabold uppercase">{s.name}</h3>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
              <ul className="mt-5 flex flex-col gap-2 text-sm">
                {s.items.map((it) => (
                  <li key={it} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red" /> {it}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Cta label="Consultar precio" className={cn("w-full", !s.featured && "border border-line bg-transparent hover:bg-panel-2")} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* La app */}
      <section className="border-y border-line/60 bg-graphite">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow text-red">Tu app Alpha Prime</p>
          <h2 className="mt-3 max-w-3xl font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">Todo tu proceso en el celular</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-card border border-line bg-panel p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red/15 text-red">
                  <f.icon size={22} />
                </span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre mí */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr]">
          <div className="relative mx-auto w-64 sm:w-72 lg:mx-0">
            <div aria-hidden className="absolute -bottom-3 -right-3 h-full w-full rounded-[1.75rem] border-2 border-red" />
            <img src={SITE.coachPhoto} alt={SITE.coachName} width={1086} height={1448} className="relative aspect-[3/4] w-full rounded-[1.75rem] object-cover object-top shadow-2xl shadow-black/60" />
          </div>
          <div>
            <p className="eyebrow text-red">Tu asesor</p>
            <h2 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">{SITE.coachName}</h2>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              Asesor de alimentación y entrenamiento. Acompaño a personas que quieren bajar grasa, ganar músculo y mejorar sus hábitos con un plan que puedan cumplir en su día a día, y con seguimiento cada semana hasta que llegan a su objetivo.
            </p>
          </div>
        </div>
      </section>

      {/* Resultados: aparece solo cuando hay testimonios reales cargados en src/lib/site.ts */}
      {TESTIMONIALS.length > 0 && (
        <section className="border-t border-line/60 bg-graphite">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="eyebrow text-red">Resultados</p>
            <h2 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">Lo que logran mis clientes</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="flex flex-col overflow-hidden rounded-card border border-line bg-panel">
                  {t.before && t.after && (
                    <div className="grid grid-cols-2 gap-px bg-line">
                      {([["Antes", t.before], ["Después", t.after]] as const).map(([label, src]) => (
                        <div key={label} className="relative">
                          <img src={src} alt={`${t.name}: ${label.toLowerCase()}`} className="aspect-[3/4] w-full object-cover" />
                          <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    {t.result && <p className="font-display text-3xl font-extrabold uppercase text-red">{t.result}</p>}
                    <blockquote className="mt-2 text-sm text-muted">“{t.text}”</blockquote>
                    <figcaption className="mt-auto pt-4 text-sm font-semibold">{t.name}</figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Llamado final */}
      <section id="contacto" className="relative scroll-mt-16 overflow-hidden border-t border-line/60">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-40 mx-auto h-80 w-[40rem] max-w-full rounded-full bg-red/25 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-7xl">
            ¿Listo para <span className="text-red">empezar?</span>
          </h2>
          <p className="mt-5 text-lg text-muted">Dejá tu solicitud (1 minuto) o escribime, y armamos juntos tu plan.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/empezar" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red px-6 text-base font-semibold text-white transition-colors hover:bg-red-hover">
              <ClipboardList size={19} /> Dejar mi solicitud
            </Link>
            <Cta className="border border-line bg-transparent hover:bg-panel-2" label="Escribime por WhatsApp" />
          </div>
          {!SITE.whatsapp && <p className="mt-3 text-xs text-faint">(Falta configurar el número de WhatsApp)</p>}
        </div>
      </section>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Alpha Prime Nutrition · Unleash your power</p>
          <div className="flex gap-5">
            {SITE.instagram && (
              <a href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-fg">
                Instagram
              </a>
            )}
            <Link href="/login" className="hover:text-fg">
              Entrar a la app
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
