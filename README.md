# ALPHA PRIME NUTRITION — *Unleash your power*

Plataforma de coaching nutricional y entrenamiento con dos roles: **COACH** y **CLIENTE**.

**Estado: Fases 1 a 5 completas.**
- Fase 1: arquitectura, base de datos, autenticación, roles y dashboards.
- Fase 2: alta/edición/suspensión de clientes, acceso por link (WhatsApp), expediente con antropometría, progreso (gráficas, antes vs actual, fotos), notas privadas, historial de cambios, y sección Progreso en el portal del cliente.
- Fase 3: calculadora nutricional (Mifflin-St Jeor, Harris-Benedict revisada, Katch-McArdle, Cunningham) con ajuste manual del coach, constructor de dietas (comidas, gramos, macros en vivo, opciones A/B, sustituciones, copiar comida/día/plan, planes por semanas, plantillas), catálogo de alimentos, tipos de día con objetivos propios (ej. tren superior / tren inferior / descanso), auto-ajuste de cantidades (propone gramos para cumplir los objetivos con los alimentos elegidos; el coach revisa, fija y aplica), suplementación pautada por plan (producto, dosis, momento, frecuencia, indicaciones) y vista Nutrición en el portal.
- Fase 4: constructor de rutinas (semanas × días; series, reps, peso, RIR, RPE, descanso, tempo, notas), catálogo de ejercicios base + propios, plantillas, copiar día/semana/rutina, periodización por semana con progresión automática (% o kg, RIR/RPE), registro de cargas del cliente por serie e historial de progresión (peso máximo, 1RM estimado, volumen).
- Fase 5: check-in semanal configurable (día, campos, preguntas propias, fotos), bandeja de revisión del coach con comparación vs semana anterior y devolución, notificaciones dentro de la app (check-in pendiente/enviado/revisado, plan nuevo/actualizado).
- Fase 6: pagos con link (Cubo u otro proveedor, sin claves ni webhooks). El coach guarda su link general y, si quiere, uno o un monto por cliente; el cliente paga en la página del proveedor y toca «Ya pagué»; el coach confirma (o rechaza con motivo) en /coach/pagos y la renovación avanza N meses. También registra pagos en efectivo o transferencia. Aviso al cliente 3 días antes de vencer. La app no ve datos de tarjetas. Migración: `20261001001000_payment_links.sql`.
- Fase 7: PWA instalable. Manifest (`src/app/manifest.ts`) con íconos normales y "maskable" (generados con `node scripts/generate-icons.mjs`), atajos a Check-in/Entreno/Nutrición, metadatos para iPhone, aviso «Instalá Alpha Prime» (botón en Android/Chrome; pasos de Compartir → Agregar a inicio en iPhone; se puede posponer 14 días) y service worker (`public/sw.js`) que guarda solo archivos estáticos: las páginas y datos siempre se piden a la red (no quedan datos privados en el teléfono) y sin internet se muestra `/offline`. Para publicar cambios del service worker, subir `VERSION` en `sw.js`.

### Acceso de clientes (Fase 2)
Al crear un cliente se genera un **link de acceso** para compartir por WhatsApp; con él crea su contraseña en `/auth/aceptar`.
No depende del correo de Supabase (que sin SMTP propio solo envía a miembros del equipo). Requisitos:
- `SUPABASE_SERVICE_ROLE_KEY` configurada en Netlify (solo servidor).
- Supabase → Authentication → URL Configuration → **Redirect URLs**: agregar `https://TU-DOMINIO/**`.

| Stack | Por qué |
|---|---|
| Next.js 16 (App Router) + TypeScript | Frontend y backend en un solo proyecto; Server Components y Server Actions |
| Supabase (PostgreSQL + Auth + Storage) | Base de datos, login seguro y fotos privadas con un solo servicio. Plan gratuito suficiente para empezar |
| Row Level Security (RLS) | La seguridad vive en la base de datos: aunque alguien cambie un ID en la URL, Postgres no le devuelve datos ajenos |
| Tailwind CSS 4 | Estilos rápidos y consistentes, mobile-first |
| Zod | Validación de datos en el servidor |

---

## 1. Requisitos

- Node.js 20.9 o superior
- Una cuenta gratuita en [supabase.com](https://supabase.com)

## 2. Configurar Supabase (una sola vez)

1. Crear un proyecto nuevo en Supabase (región más cercana: *East US*).
2. **Authentication → Sign In / Providers → Email**: dejar Email activado.
3. **Authentication → Sign In / Providers → "Allow new users to sign up": DESACTIVAR.**
   Las cuentas las crea el coach; nadie puede registrarse solo.
4. **Authentication → URL Configuration → Site URL**: `http://localhost:3000` (en producción, tu dominio).
5. Aplicar las migraciones (elegí una opción):

   **Opción A — Supabase CLI (recomendada):**
   ```bash
   npx supabase login
   npx supabase init        # solo la primera vez; no sobrescribe las migraciones
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push
   ```

   **Opción B — SQL Editor del panel:** pegar y ejecutar, en este orden:
   `supabase/migrations/20261001000100_schema.sql`
   `supabase/migrations/20261001000200_security.sql`
   `supabase/migrations/20261001000300_storage.sql`
   `supabase/migrations/20261001000400_nutrition.sql`
   `supabase/migrations/20261001000500_supplements.sql`
   `supabase/migrations/20261001000600_day_types.sql`
   `supabase/migrations/20261001000700_training.sql`
   `supabase/migrations/20261001000800_adductors.sql`
   `supabase/migrations/20261001000900_checkins.sql`

## 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completar con los valores de **Project Settings → API**:

| Variable | Dónde está | ¿Pública? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon` / `publishable` | Sí (RLS protege los datos) |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` / `secret` | **NO. Solo servidor.** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Sí |

## 4. Ejecutar

```bash
npm install
npm run seed      # datos demo (opcional)
npm run dev       # http://localhost:3000
```

## 5. Crear el primer coach (cuenta real)

```bash
npm run create-coach -- --email carlos@tudominio.com --name "Carlos Aguilar" --password "UnaClaveLarga2026!"
```

El rol se guarda en `app_metadata`, que solo puede escribir el backend con la service role. Un usuario no puede convertirse en coach editando su propio perfil.

## 6. Credenciales demo (`npm run seed`)

Todos los datos son ficticios. Contraseña de todas: **`AlphaDemo2026!`** (cambiable con `DEMO_PASSWORD`).

| Rol | Correo | Situación de prueba |
|---|---|---|
| Coach | `coach@alphaprime.demo` | Carlos Aguilar, ve a los 4 clientes |
| Cliente | `juan@alphaprime.demo` | Activo, adherencia alta |
| Cliente | `maria@alphaprime.demo` | Activa, **vence en 4 días**, check-in pendiente |
| Cliente | `pedro@alphaprime.demo` | **Vencido** fuera de gracia → ve la pantalla de bloqueo |
| Cliente | `ana@alphaprime.demo` | **Pago fallido, en periodo de gracia** → ve advertencia, conserva acceso |

El seed se puede ejecutar varias veces: borra y recrea solo las cuentas `@alphaprime.demo`. **No ejecutarlo en producción.**

---

## Estructura

```
alpha-prime-nutrition/
├── supabase/
│   ├── migrations/
│   │   ├── 20261001000100_schema.sql     # 26 tablas, tipos e índices
│   │   ├── 20261001000200_security.sql   # RLS, roles, membresía, auditoría, vista del dashboard
│   │   └── 20261001000300_storage.sql    # bucket privado de fotos de progreso
│   └── tests/rls_smoke_test.sql          # pruebas de aislamiento entre usuarios
├── scripts/
│   ├── create-coach.ts
│   └── seed-demo.ts
├── src/
│   ├── proxy.ts                           # refresca sesión y bloquea rutas privadas
│   ├── app/
│   │   ├── login/                         # formulario + server action con Zod
│   │   ├── auth/signout/route.ts
│   │   ├── coach/                         # panel del coach (rol coach)
│   │   │   ├── page.tsx                   # dashboard: métricas, alertas, tabla, búsqueda y filtros
│   │   │   └── clientes/[id]/page.tsx     # ficha básica (se amplía en Fase 2)
│   │   ├── portal/                        # app del cliente (rol cliente)
│   │   │   ├── page.tsx                   # inicio: semana, peso, adherencia, check-in, membresía
│   │   │   └── membresia/page.tsx         # estado e historial (siempre accesible)
│   │   └── (legal)/privacidad, terminos   # estructura legal
│   ├── components/  ui/, brand/, coach/, portal/
│   └── lib/
│       ├── supabase/ server, client, admin, proxy
│       ├── data/     consultas del coach y del portal
│       ├── auth.ts   sesión y control de rol
│       └── membership.ts, format.ts, env.ts, types.ts
└── .env.example
```

## Cómo está protegida la información

- **RLS en todas las tablas.** El coach solo ve a *sus* clientes; el cliente solo *su* ficha. Probado: un cliente que manda el ID de otro recibe 0 filas o un error de permisos.
- **Estado de membresía calculado en la base de datos** (`membership_status`), nunca en el navegador. Cuando vence la gracia, la base deja de devolver al cliente sus planes, rutinas, progreso y check-ins. Los datos **no se borran** y el coach siempre los ve.
- **Pagos y suscripciones:** el cliente solo puede leerlos. Solo el backend (webhooks) puede escribirlos.
- **Notas privadas del coach** en tabla aparte, invisibles para el cliente.
- **Privilegios por columna:** un cliente no puede cambiar su rol, ni su fecha de renovación, ni los campos de revisión de su check-in.
- **Auditoría automática** (`audit_logs`): quién cambió qué y cuándo, con valor anterior y nuevo. Ej.: `target_kcal: 2700 → 2850` por *Carlos Aguilar*.
- **Fotos** en bucket privado, ruta `{client_id}/archivo`, servidas solo con URL firmada.
- Cabeceras de seguridad (HSTS, X-Frame-Options, nosniff), errores sin datos sensibles en logs, redirecciones de login solo a rutas internas.

## Decisiones técnicas

- **Supabase en vez de backend propio:** menos piezas que mantener y pagar; Auth, Postgres y Storage en uno. Se puede migrar a Postgres propio porque todo es SQL estándar.
- **Pagos manuales desde el día 1:** las tablas `subscriptions`/`payments` aceptan `provider = 'manual'` (efectivo, transferencia) además de `stripe`. Ver nota sobre Stripe abajo.
- **Calculadora nutricional como apoyo, no decisión:** muestra fórmula, datos usados y resultado; el coach puede editar cualquier valor final y queda registrado como "ajuste manual" junto al cálculo original (`nutrition_plans.calculation`). Valores de alimentos base aproximados (USDA); el coach puede crear los suyos.
- **RLS rápida en el árbol del plan:** en vez de evaluar funciones por fila, cada consulta calcula una vez el conjunto de IDs permitidos (`nutrition_scope_*`). El cliente solo ve su plan **activo**.
- **Auto-ajuste como propuesta:** mínimos cuadrados con límites por alimento (`src/lib/nutrition/autofit.ts`), redondeo a porciones prácticas; nada se guarda sin que el coach lo aplique.
- **Registro de cargas validado en la base:** un trigger verifica que cada serie sea de un ejercicio de la rutina ACTIVA del propio cliente y que la fecha no sea futura.
- **Recordatorio de check-in sin tareas programadas:** `checkin_reminder_tick()` se evalúa cuando el cliente abre la app y crea como máximo un aviso por semana (no requiere cron ni servicios extra).
- **Fórmulas y adherencia como sugerencia:** el check-in calcula una adherencia sugerida (60 % nutrición + 40 % entrenamientos), pero el coach puede sobrescribirla (`coach_adherence_override`).

## Deployment (producción)

1. Subir el repositorio a GitHub (`.env.local` está en `.gitignore`).
2. Importarlo en [vercel.com](https://vercel.com) (plan gratuito para empezar).
3. En Vercel → Settings → Environment Variables: cargar las 4 variables de `.env.example` con los valores de producción.
4. En Supabase → URL Configuration: Site URL = tu dominio de Vercel.
5. Crear el coach real con `npm run create-coach` apuntando a producción (desde tu computadora con `.env.local` de producción).

## Qué falta para producción

- [x] Fases 6–7 (pagos con link, PWA).
- [ ] Notificaciones por correo/push: la tabla `notifications` ya registra los canales enviados (`delivered`); falta conectar un proveedor (ej. Resend para correo, Web Push en la Fase 7).
- [ ] **Pagos:** Stripe no lista a El Salvador como país para abrir cuenta. Opciones: empresa en un país soportado (p. ej. LLC en EE. UU.), o una pasarela disponible localmente. Confirmalo en [stripe.com/global](https://stripe.com/global) antes de la Fase 6.
- [ ] Texto legal definitivo de privacidad y términos (revisión profesional).
- [ ] SMTP propio en Supabase (Authentication → SMTP) para enviar correos de invitación y recuperación desde tu dominio.
- [ ] Activar backups automáticos (Supabase Pro) o programar exportaciones.
- [ ] Dominio propio y HTTPS (Vercel lo da automáticamente).

## Pruebas

```bash
npm run typecheck   # TypeScript
npm run build       # build de producción
```

`supabase/tests/rls_smoke_test.sql` verifica el aislamiento entre usuarios sobre un Postgres local (ver comentarios del archivo). `supabase/tests/nutrition_smoke_test.sql` prueba copiar días/planes, activar planes y que el cliente solo vea su plan activo.
