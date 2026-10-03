import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { accountStatus, invitesEnabled } from "@/lib/invite";
import { getProgressData } from "@/lib/data/progress";
import { programWeek } from "@/lib/data/portal";
import { ageFrom, bmi, SEX_LABEL } from "@/lib/anthropometry";
import { describeAudit, type AuditRow } from "@/lib/audit";
import { formatDate, formatKg, formatMoney, formatPct, relativeDays } from "@/lib/format";
import { formatLb, kgToLb } from "@/lib/units";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "@/lib/membership";
import { MEASUREMENT_FIELDS } from "@/lib/validation/client";
import type { ClientOverviewRow } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Avatar, Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { AccessLinkButton } from "@/components/coach/access-link-button";
import { clientIntakes, hasFullIntake } from "@/lib/data/intakes";
import { titleCase } from "@/lib/messages";
import { IntakeAnswersView } from "@/components/intake/intake-answers";
import { ShareLink } from "@/components/intake/share-link";
import { ClipboardList, MessageCircle } from "lucide-react";
import { publicEnv } from "@/lib/env";
import { MeasurementForm } from "@/components/coach/measurement-form";
import { NoteForm } from "@/components/coach/note-form";
import { ProgressView } from "@/components/progress/progress-view";
import { PhotoUpload } from "@/components/progress/photo-upload";
import { listClientPlans, listTemplates } from "@/lib/data/nutrition";
import { PlanList } from "@/components/nutrition/plan-list";
import { NewPlanForm } from "@/components/nutrition/new-plan-form";
import { exercisesByIds, getClientLogs, listClientWorkouts, listWorkoutTemplates } from "@/lib/data/training";
import { WorkoutList } from "@/components/training/workout-list";
import { NewWorkoutForm } from "@/components/training/new-workout-form";
import { ProgressionView } from "@/components/training/progression-view";
import { getCheckinPhotos, getClientCheckins, getCoachCheckinSettings } from "@/lib/data/checkins";
import { parseCheckinConfig } from "@/lib/checkin";
import { CheckinCard } from "@/components/checkin/checkin-card";
import { ReviewForm } from "@/components/checkin/review-form";
import { getClientPayments, getCoachPaymentSettings } from "@/lib/data/payments";
import { ClientPaymentForm, PendingPaymentActions, RegisterPaymentForm } from "@/components/payments/coach-forms";
import { PaymentList } from "@/components/payments/payment-list";
import { serviceLabel } from "@/lib/services";
import { snapshotsByDate } from "@/lib/comparison";
import { Comparison } from "@/components/progress/comparison";
import {
  accessLinkAction,
  addMeasurementAction,
  addNoteAction,
  deleteMeasurementAction,
  deleteNoteAction,
  setClientStatusAction,
} from "../actions";

export const metadata: Metadata = { title: "Perfil del cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "cuestionario", label: "Cuestionario" },
  { id: "nutricion", label: "Nutrición" },
  { id: "entrenamiento", label: "Entrenamiento" },
  { id: "checkins", label: "Check-ins" },
  { id: "pagos", label: "Pagos" },
  { id: "antropometria", label: "Antropometría" },
  { id: "progreso", label: "Progreso" },
  { id: "notas", label: "Notas" },
  { id: "historial", label: "Historial" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const ACCOUNT_LABEL = {
  none: "Sin acceso a la app",
  pending: "Invitación pendiente",
  active: "Acceso activo",
  unknown: "Vinculada",
} as const;

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; guardado?: string }>;
}) {
  const coachProfile = await requireRole("coach");
  const coachIdForTabs = coachProfile.id;
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "resumen";

  const supabase = await createClient();
  // RLS: si el cliente no es de este coach, no hay fila → 404 (no se revela que existe).
  const [{ data: client }, { data: overview }, { data: profile }] = await Promise.all([
    supabase.from("clients").select("id, first_name, last_name, email, phone, goal, status, start_date, renewal_date, user_id, has_nutrition, has_training").eq("id", id).maybeSingle(),
    supabase.from("coach_client_overview").select("*").eq("id", id).maybeSingle(),
    supabase.from("client_profiles").select("birth_date, sex, height_cm").eq("client_id", id).maybeSingle(),
  ]);
  if (!client || !overview) notFound();

  const o = overview as ClientOverviewRow;
  const name = `${client.first_name} ${client.last_name}`.trim();
  const height = profile?.height_cm != null ? Number(profile.height_cm) : null;
  const suspended = client.status === "suspended";
  const account = await accountStatus(client.user_id);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/coach#clientes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Clientes
      </Link>

      {sp.guardado && (
        <p role="status" className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-2.5 text-sm text-ok">Cambios guardados.</p>
      )}

      <header className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={name} src={o.avatar_url} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-4xl">{name}</h1>
            <p className="mt-1 text-muted">{client.goal || "Sin objetivo definido"}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge tone={MEMBERSHIP_TONE[o.membership_status]}>{MEMBERSHIP_LABEL[o.membership_status]}</Badge>
              <Badge tone="neutral">{serviceLabel(client)}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/coach/chat/${id}`} className={buttonClass("secondary", "sm")}>
            <MessageCircle size={15} /> Mensaje
          </Link>
          <Link href={`/coach/clientes/${id}/editar`} className={buttonClass("secondary", "sm")}>
            <Pencil size={15} /> Editar
          </Link>
          {invitesEnabled() && account !== "active" && (
            <AccessLinkButton
              action={accessLinkAction.bind(null, id)}
              label={account === "none" ? "Invitar por WhatsApp" : "Reenviar invitación"}
              firstName={client.first_name}
              phone={client.phone}
              primary
            />
          )}
          {suspended ? (
            <ConfirmButton
              action={setClientStatusAction.bind(null, id, "active")}
              label={<><Play size={15} /> Reactivar</>}
              confirmText={`¿Reactivar a ${client.first_name}?`}
              confirmLabel="Sí, reactivar"
              tone="neutral"
            />
          ) : (
            <ConfirmButton
              action={setClientStatusAction.bind(null, id, "suspended")}
              label={<><Pause size={15} /> Suspender</>}
              confirmText={`${client.first_name} perderá el acceso a su plan. Sus datos se conservan.`}
              confirmLabel="Sí, suspender"
            />
          )}
        </div>
      </header>

      {tab !== "cuestionario" && !(await hasFullIntake(id)) && (
        <Link
          href={`/coach/clientes/${id}?tab=cuestionario`}
          scroll={false}
          className="flex items-center gap-3 rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm hover:bg-red/15"
        >
          <ClipboardList size={18} className="shrink-0 text-red" />
          <span className="flex-1">
            <strong>Falta el cuestionario completo.</strong>{" "}
            {o.membership_status === "active" || o.membership_status === "grace"
              ? `Mandale su link a ${titleCase(client.first_name)} para armar su plan.`
              : `Cuando ${titleCase(client.first_name)} haya pagado, mandale su link.`}
          </span>
          <span className="font-semibold text-red">Enviar</span>
        </Link>
      )}

      <nav aria-label="Secciones del perfil" className="-mx-4 overflow-x-auto border-b border-line px-4 lg:mx-0 lg:px-0">
        <ul className="flex gap-1">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/coach/clientes/${id}?tab=${t.id}`}
                scroll={false}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "relative block whitespace-nowrap px-3 py-3 text-sm font-semibold transition-colors",
                  tab === t.id ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {t.label}
                {tab === t.id && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-red" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "resumen" && (
        <Summary
          id={id}
          client={client}
          o={o}
          profile={profile}
          height={height}
          account={account}
          invites={invitesEnabled()}
        />
      )}
      {tab === "cuestionario" && <Questionnaire id={id} firstName={client.first_name} phone={client.phone} />}
      {tab === "nutricion" && !client.has_nutrition && <ServiceNote id={id} what="nutrición" />}
      {tab === "nutricion" && <Nutrition id={id} />}
      {tab === "entrenamiento" && !client.has_training && <ServiceNote id={id} what="entrenamiento" />}
      {tab === "entrenamiento" && <Training id={id} />}
      {tab === "checkins" && <Checkins id={id} coachId={coachIdForTabs} />}
      {tab === "pagos" && <Payments id={id} coachId={coachIdForTabs} renewal={client.renewal_date} />}
      {tab === "antropometria" && <Anthropometry id={id} height={height} />}
      {tab === "progreso" && <Progress id={id} />}
      {tab === "notas" && <Notes id={id} />}
      {tab === "historial" && <History id={id} />}
    </div>
  );
}

// ---------------------------------------------------------------- Resumen

function Summary({
  id, client, o, profile, height, account, invites,
}: {
  id: string;
  client: { first_name: string; email: string; phone: string | null; start_date: string; renewal_date: string | null; user_id: string | null };
  o: ClientOverviewRow;
  profile: { birth_date: string | null; sex: string | null } | null;
  height: number | null;
  account: keyof typeof ACCOUNT_LABEL;
  invites: boolean;
}) {
  const age = ageFrom(profile?.birth_date);
  const currentBmi = bmi(o.current_weight_kg != null ? Number(o.current_weight_kg) : null, height);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-5">
        <h2 className="eyebrow mb-3">Datos personales</h2>
        <dl className="grid gap-2.5 text-sm">
          <Item k="Correo" v={<span className="break-all">{client.email}</span>} />
          <Item k="Teléfono" v={client.phone || "—"} />
          <Item k="Edad" v={age != null ? `${age} años` : "—"} />
          <Item k="Sexo" v={profile?.sex ? SEX_LABEL[profile.sex] : "—"} />
          <Item k="Altura" v={height ? `${height} cm` : "—"} />
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="eyebrow mb-3">Seguimiento</h2>
        <dl className="grid gap-2.5 text-sm">
          <Item k="Peso actual" v={<span className="tnum">{formatLb(o.current_weight_kg)}</span>} />
          <Item k="% grasa" v={<span className="tnum">{formatPct(o.current_body_fat_pct)}</span>} />
          <Item k="IMC" v={<span className="tnum">{currentBmi ?? "—"}</span>} />
          <Item k="Adherencia (últimos 4)" v={<span className="tnum">{formatPct(o.adherence_pct)}</span>} />
          <Item k="Último check-in" v={relativeDays(o.last_checkin_at)} />
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="eyebrow mb-3">Programa y acceso</h2>
        <dl className="grid gap-2.5 text-sm">
          <Item k="Inicio" v={`${formatDate(client.start_date)} · semana ${programWeek(client.start_date)}`} />
          <Item k="Renovación" v={formatDate(client.renewal_date)} />
          <Item k="App" v={ACCOUNT_LABEL[account]} />
        </dl>
        <div className="mt-4">
          {invites ? (
            account !== "active" ? (
              <p className="text-xs text-faint">
                {account === "none" ? "Todavía no lo invitaste. Cuando su plan esté listo, usá «Invitar por WhatsApp» arriba." : "Invitación enviada, todavía no creó su contraseña."}
              </p>
            ) : (
              <AccessLinkButton action={accessLinkAction.bind(null, id)} label="Link para cambiar contraseña" firstName={client.first_name} phone={client.phone} />
            )
          ) : (
            <p className="text-xs text-faint">Para dar acceso a la app falta configurar SUPABASE_SERVICE_ROLE_KEY en Netlify.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-faint">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- Nutrición

async function Nutrition({ id }: { id: string }) {
  const [plans, templates] = await Promise.all([listClientPlans(id), listTemplates()]);
  const active = plans.find((p) => p.is_active);
  return (
    <div className="flex flex-col gap-5">
      {active ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="eyebrow">Plan activo</p>
            <p className="mt-1 font-display text-2xl font-extrabold uppercase">{active.name}</p>
            <p className="tnum text-sm text-muted">
              {active.target_kcal ? `${active.target_kcal.toLocaleString("es-SV")} kcal · P ${active.target_protein_g} g · C ${active.target_carbs_g} g · G ${active.target_fat_g} g` : "Sin objetivos definidos"}
            </p>
          </div>
          <Link href={`/coach/planes/${active.id}`} className={buttonClass("primary", "md")}>Abrir plan</Link>
        </Card>
      ) : (
        <Card className="px-5 py-4 text-sm text-muted">Este cliente no tiene un plan activo. Creá uno o activá un borrador.</Card>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">Planes</h2>
      </div>
      <NewPlanForm clientId={id} templates={templates.map((t) => ({ id: t.id, name: t.name, weeks: t.weeks }))} />
      <PlanList plans={plans} empty="Todavía no hay planes para este cliente." />
    </div>
  );
}

// ---------------------------------------------------------------- Entrenamiento

async function Training({ id }: { id: string }) {
  const [plans, templates, logs] = await Promise.all([listClientWorkouts(id), listWorkoutTemplates(), getClientLogs(id)]);
  const exercises = await exercisesByIds([...new Set(logs.map((l) => l.exercise_id))]);
  const active = plans.find((p) => p.is_active);
  const lastDate = logs[0]?.performed_at;
  return (
    <div className="flex flex-col gap-5">
      {active ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="eyebrow">Rutina activa</p>
            <p className="mt-1 font-display text-2xl font-extrabold uppercase">{active.name}</p>
            <p className="text-sm text-muted">
              {active.weeks} {active.weeks === 1 ? "semana" : "semanas"}
              {lastDate ? ` · último registro ${formatDate(lastDate)}` : " · sin registros todavía"}
            </p>
          </div>
          <Link href={`/coach/rutinas/${active.id}`} className={buttonClass("primary", "md")}>Abrir rutina</Link>
        </Card>
      ) : (
        <Card className="px-5 py-4 text-sm text-muted">Este cliente no tiene una rutina activa. Creá una o activá un borrador.</Card>
      )}
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">Rutinas</h2>
      <NewWorkoutForm clientId={id} templates={templates.map((t) => ({ id: t.id, name: t.name, weeks: t.weeks }))} />
      <WorkoutList plans={plans} empty="Todavía no hay rutinas para este cliente." />
      <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight">Progresión de cargas</h2>
      <ProgressionView logs={logs} exercises={exercises} empty="El cliente todavía no registró cargas." />
    </div>
  );
}

// ---------------------------------------------------------------- Check-ins

function ServiceNote({ id, what }: { id: string; what: string }) {
  return (
    <p role="note" className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm">
      Su servicio no incluye {what}: el cliente no ve esta sección en su app. Podés preparar el plan igual y, si lo contrata,{" "}
      <Link href={`/coach/clientes/${id}/editar`} className="font-semibold underline">cambiá su servicio</Link>.
    </p>
  );
}

// ---------------------------------------------------------------- Pagos

async function Payments({ id, coachId, renewal }: { id: string; coachId: string; renewal: string | null }) {
  const supabase = await createClient();
  const [settings, payments, { data: own }] = await Promise.all([
    getCoachPaymentSettings(coachId),
    getClientPayments(id),
    supabase.from("clients").select("payment_link, payment_amount_cents").eq("id", id).maybeSingle(),
  ]);
  const pending = payments.filter((p) => p.status === "pending");
  const history = payments.filter((p) => p.status !== "pending");
  const amount = own?.payment_amount_cents ?? settings.payment_amount_cents;

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted">Próxima renovación</p>
          <p className="font-display text-2xl font-extrabold uppercase">{formatDate(renewal)}</p>
        </div>
        <p className="text-sm text-muted">
          Mensualidad: <span className="tnum font-semibold text-fg">{amount != null ? formatMoney(amount) : "sin definir"}</span>
          {own?.payment_link ? " · link propio" : settings.payment_link ? " · link general" : " · sin link"}
        </p>
      </Card>

      {pending.map((p) => (
        <Card key={p.id} className="flex flex-col gap-3 border-warn/40 p-5">
          <p className="font-semibold">
            Avisó que pagó <span className="tnum">{formatMoney(p.amount_cents)}</span> {relativeDays(p.created_at).toLowerCase()}
            {p.reference ? <span className="font-normal text-muted"> · Ref. {p.reference}</span> : null}
          </p>
          <PendingPaymentActions paymentId={p.id} clientId={id} />
        </Card>
      ))}

      <Card className="flex flex-col gap-3 p-5">
        <p className="font-semibold">Registrar un pago</p>
        <p className="text-sm text-muted">Para pagos en efectivo, transferencia o un cobro de Cubo que el cliente no avisó. La renovación avanza los meses que elijas.</p>
        <RegisterPaymentForm clientId={id} defaultAmountCents={amount} />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Historial</h2>
        <Card>{history.length ? <PaymentList items={history} /> : <EmptyState title="Sin pagos registrados" />}</Card>
      </section>

      <Card className="flex flex-col gap-3 p-5">
        <p className="font-semibold">Link y monto de este cliente</p>
        <ClientPaymentForm clientId={id} link={own?.payment_link ?? null} amountCents={own?.payment_amount_cents ?? null} defaults={{ link: settings.payment_link, amount_cents: settings.payment_amount_cents }} />
      </Card>
    </div>
  );
}

async function Checkins({ id, coachId }: { id: string; coachId: string }) {
  const [list, settings] = await Promise.all([getClientCheckins(id), getCoachCheckinSettings(coachId)]);
  const config = parseCheckinConfig(settings.config);
  const photos = await getCheckinPhotos(list.slice(0, 20).map((c) => c.id));
  if (!list.length) return <Card><EmptyState title="Sin check-ins todavía" description="Cuando el cliente envíe su primer check-in aparece acá." /></Card>;
  return (
    <div className="flex flex-col gap-4">
      {list.map((c, i) => (
        <CheckinCard key={c.id} c={c} previous={list[i + 1] ?? null} photos={photos.get(c.id)} config={config}>
          <ReviewForm checkinId={c.id} initialFeedback={c.coach_feedback} adherence={c.adherence_score} override={c.coach_adherence_override} reviewed={c.status === "reviewed"} />
        </CheckinCard>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Antropometría

async function Anthropometry({ id, height }: { id: string; height: number | null }) {
  const { rows, heightCm } = await getProgressData(id);
  const history = [...rows].reverse();
  const used = MEASUREMENT_FIELDS.filter((f) => rows.some((r) => r[f.key] != null));

  return (
    <div className="flex flex-col gap-5">
      <MeasurementForm action={addMeasurementAction.bind(null, id)} />
      <Comparison snapshots={snapshotsByDate(rows, heightCm ?? height)} />
      <Card className="p-0">
        {history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-line text-left text-faint">
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">Fecha</th>
                  {used.map((f) => (
                    <th key={f.key} scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
                      {f.label} <span className="normal-case tracking-normal">({f.unit})</span>
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">IMC</th>
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">Otros</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="tnum">
                {history.map((r) => (
                  <tr key={(r.id ?? "") + (r.bodyCompId ?? "")} className="border-b border-line last:border-0 align-top">
                    <td className="px-4 py-3 font-medium">
                      {formatDate(r.measured_at)}
                      {r.notes && <p className="mt-0.5 max-w-[14rem] whitespace-normal text-xs font-normal text-faint">{r.notes}</p>}
                    </td>
                    {used.map((f) => (
                      <td key={f.key} className="px-3 py-3">
                        {f.key === "weight_kg" && r.weight_kg != null ? kgToLb(Number(r.weight_kg)) : (r[f.key] ?? <span className="text-faint">—</span>)}
                      </td>
                    ))}
                    <td className="px-3 py-3">{bmi(r.weight_kg, height) ?? <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-3 text-xs text-muted">
                      {Object.entries(r.extra).map(([k, v]) => `${k}: ${v}`).join(" · ") || <span className="text-faint">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ConfirmButton
                        action={deleteMeasurementAction.bind(null, id, r.id, r.bodyCompId)}
                        label={<Trash2 size={15} aria-label={`Eliminar medición del ${formatDate(r.measured_at)}`} />}
                        confirmText="¿Eliminar?"
                        confirmLabel="Sí"
                        size="xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin mediciones" description="Registrá la primera medición para empezar el historial." />
        )}
      </Card>
      {!height && <p className="text-xs text-faint">Agregá la altura en "Editar" para calcular el IMC.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Progreso

async function Progress({ id }: { id: string }) {
  const { rows, photos, heightCm } = await getProgressData(id);
  return <ProgressView rows={rows} photos={photos} clientId={id} heightCm={heightCm} canManagePhotos uploader={<PhotoUpload clientId={id} />} />;
}

// ---------------------------------------------------------------- Notas

async function Notes({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("coach_notes")
    .select("id, body, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <Card className="h-fit p-5">
        <h2 className="eyebrow mb-1">Nueva nota</h2>
        <p className="mb-3 text-xs text-faint">Solo vos las ves. El cliente nunca tiene acceso.</p>
        <NoteForm action={addNoteAction.bind(null, id)} />
      </Card>
      <div className="flex flex-col gap-3">
        {notes?.length ? (
          notes.map((n) => (
            <Card key={n.id} className="p-4">
              <p className="whitespace-pre-wrap text-sm">{n.body}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-faint">{formatDate(n.created_at)}</span>
                <ConfirmButton action={deleteNoteAction.bind(null, id, n.id)} label={<Trash2 size={14} aria-label="Eliminar nota" />} confirmText="¿Eliminar nota?" confirmLabel="Sí" size="xs" />
              </div>
            </Card>
          ))
        ) : (
          <Card><EmptyState title="Sin notas" description="Usá las notas para lesiones, preferencias o acuerdos con el cliente." /></Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Historial

async function History({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_name, entity, action, changes, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as AuditRow[];

  return rows.length ? (
    <Card className="p-0">
      <ol>
        {rows.map((r) => {
          const d = describeAudit(r);
          return (
            <li key={r.id} className="flex gap-3 border-b border-line px-5 py-3.5 last:border-0">
              <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", r.action === "delete" ? "bg-bad" : r.action === "insert" ? "bg-ok" : "bg-warn")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{d.title}</p>
                {d.details.length > 0 && (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {d.details.map((x) => (
                      <li key={x} className="tnum text-xs text-muted">{x}</li>
                    ))}
                  </ul>
                )}
              </div>
              <time dateTime={r.created_at} className="shrink-0 text-xs text-faint">
                {new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/El_Salvador" }).format(new Date(r.created_at))}
              </time>
            </li>
          );
        })}
      </ol>
    </Card>
  ) : (
    <Card><EmptyState title="Sin cambios registrados" /></Card>
  );
}

async function Questionnaire({ id, firstName, phone }: { id: string; firstName: string; phone: string | null }) {
  const supabase = await createClient();
  const [{ data: row }, { full, short }] = await Promise.all([
    supabase.from("clients").select("intake_token").eq("id", id).maybeSingle(),
    clientIntakes(id),
  ]);
  const url = row?.intake_token ? `${publicEnv().NEXT_PUBLIC_SITE_URL}/cuestionario/${row.intake_token}` : null;

  return (
    <div className="flex flex-col gap-5">
      {url && (
        <Card className={cn("flex flex-col gap-3 p-5", !full && "border-red/40")}>
          <h2 className="eyebrow">{full ? "Volver a enviar el cuestionario completo" : "Mandale el cuestionario completo"}</h2>
          <p className="text-sm text-muted">
            Su link personal: salud, alimentación, entrenamiento y estilo de vida. Lo que responda queda guardado aquí y te llega una notificación.
          </p>
          <ShareLink url={url} phone={phone} waText={`¡Hola ${firstName}! Bienvenido a Alpha Prime 💪 Para armar tu plan a tu medida, llená este cuestionario (te toma unos 5 minutos):`} />
        </Card>
      )}
      {full ? (
        <>
          <p className="text-sm text-muted">Cuestionario completo respondido el {formatDate(full.created_at)}</p>
          <IntakeAnswersView answers={full.answers} />
        </>
      ) : (
        <Card>
          <EmptyState title="Sin cuestionario completo" description="Todavía no lo llenó. Mandale su link y sus respuestas aparecen aquí." />
        </Card>
      )}
      {short && (
        <details className="rounded-card border border-line bg-panel p-5">
          <summary className="cursor-pointer text-sm font-semibold">Solicitud inicial ({formatDate(short.created_at)})</summary>
          <div className="mt-4">
            <IntakeAnswersView answers={short.answers} />
          </div>
        </details>
      )}
    </div>
  );
}
