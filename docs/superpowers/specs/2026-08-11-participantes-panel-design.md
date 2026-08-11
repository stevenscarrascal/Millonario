# Conectar registro de participantes (/juego) con el panel de organización

## Problema

`/juego` ya captura nombre/correo/teléfono al inicio de cada partida (`app/juego/page.tsx`,
función `register()`) y los guarda vía `POST /api/participants` en la tabla SQLite local
`participants` (`db/schema.ts`). Esa tabla es completamente global: no tiene ninguna columna que
la relacione con una organización de Supabase.

El panel (`/panel`, `app/panel/dashboard-client.tsx`) es, en la parte de participantes, un mockup
estático: `usedParticipants` está hardcodeado a `0`, la pestaña "Participantes" siempre muestra el
estado vacío ("Aún no hay participantes"), y el modal de invitación muestra un link falso
(`cumplimiento.co/juego/próxima-sesión`) que no lleva ningún identificador real.

No existe hoy ningún mecanismo que asocie una partida de `/juego` con una organización. El
objetivo de este trabajo es cerrar ese circuito: que los participantes que se registran desde el
link de una organización aparezcan en el panel de esa organización.

## Decisiones de producto (confirmadas con el usuario)

1. **Link único por organización**, en formato `?org=<id>` (no ruta dinámica): cada organización
   comparte `https://<dominio>/juego?org=<organization.id>` desde su panel.
2. **Acceso estricto**: si falta `org`, el id no existe, o la organización existe pero su plan no
   está activo (mismo criterio `isActive` que ya usa el panel: `status === 'active' && (!expires_at
   || expires_at > now())`), el juego **no se muestra** — se bloquea con una pantalla de link
   inválido/vencido, sin distinguir entre "no existe" y "vencido" (evita enumeración).
3. **Datos visibles en el panel**: la pestaña "Participantes" muestra una lista real (nombre,
   correo, teléfono, fecha de registro), no solo un conteo.

## Arquitectura

Dos almacenes de datos siguen existiendo por separado (decisión ya tomada en la migración a VPS:
Supabase Postgres para identidad/cuenta, SQLite local para datos de embudo/participantes) — este
trabajo los conecta mediante un identificador compartido (`organization_id`), no los fusiona.

```
Panel (autenticado, Supabase)          /juego (público, sin login)
────────────────────────────           ──────────────────────────
organization.id  ──────────────────►  ?org=<id>  (link de invitación)
                                             │
                                             ▼
                                   get_public_organization(org_id)  [Supabase RPC, SECURITY DEFINER]
                                             │
                                   ¿existe y plan activo? ──No──► pantalla "link inválido"
                                             │ Sí
                                             ▼
                                       se muestra el juego
                                             │
                                   registro (nombre/correo/tel) + organizationId
                                             │
                                             ▼
                                   POST /api/participants  ──►  SQLite: participants
                                                                 (organization_id = <id>)
                                             ▲
                                             │  (filtrado por organization_id del usuario logueado)
                                     Panel: /panel lee SQLite directamente (server-side)
```

### Supabase: `get_public_organization`

Nueva función en `supabase/schema.sql`, junto al resto del esquema ya versionado ahí:

- `SECURITY DEFINER`, `SET search_path = public`, igual que las funciones existentes.
- Firma: `get_public_organization(org_id uuid) returns jsonb`.
- Devuelve `jsonb_build_object('name', o.name, 'is_active', <bool>)` si el id existe; `null` si no.
- `is_active` se calcula igual que en el panel: `status = 'active' and (expires_at is null or
  expires_at > now())`.
- No expone `participant_limit`, `plan` ni `expires_at` — son datos internos de la organización,
  innecesarios para decidir si un desconocido puede entrar a jugar.
- `grant execute on function public.get_public_organization(uuid) to anon, authenticated;` — es la
  única función pensada para ser llamada sin sesión.

### SQLite: columna `organization_id` en `participants`

- `db/schema.ts`: agrega `organizationId: text("organization_id")` a la tabla `participants`
  (nullable a nivel de columna, por compatibilidad con filas viejas sin organización; la app
  siempre la va a poblar de ahora en más porque `/juego` exige `org` para siquiera cargar).
- Índice sobre `organization_id` para el filtro que hace el panel.
- Nueva migración generada con `pnpm run db:generate`.
- `db/index.ts` actualiza el `CREATE TABLE IF NOT EXISTS` de bootstrap para incluir la columna.

### `app/api/participants/route.ts`

Acepta `organizationId?: string` en el body y lo guarda tal cual (texto libre — no hay validación
cruzada de que el id exista en Supabase en este punto, porque el gate real ya ocurrió al cargar
`/juego`; ver "Fuera de alcance").

### `/juego` — separar validación de servidor y juego de cliente

- `app/juego/page.tsx` pasa a ser un **server component async**: lee `searchParams.org`, llama a
  `get_public_organization` vía `lib/supabase/server.ts`, y:
  - si `org` falta, la función devuelve `null`, o `is_active` es `false` → renderiza una pantalla
    de error ("Este enlace no es válido o ya venció. Contacta a quien te invitó.") con el mismo
    lenguaje visual que el resto de `/juego` (clase `panel`, tipografía existente).
  - si es válido → renderiza `<GameClient organizationId={org} />`.
- `app/juego/game-client.tsx` (nuevo): todo el contenido actual de `page.tsx` (todos los estados,
  pantallas welcome/register/avatar/game/end, audio, etc.) se mueve aquí sin cambios de
  comportamiento, salvo que `register()` ahora incluye `organizationId` en el body del POST.

### `/panel` — datos reales

- `app/panel/page.tsx` (ya resuelve `organization.id`): agrega una consulta a
  `getDb().select().from(participants).where(eq(participants.organizationId, organization.id))
  .orderBy(desc(participants.createdAt))`, y pasa la lista (y el link de invitación armado con
  `organization.id`) como props a `DashboardClient`.
- `app/panel/dashboard-client.tsx`:
  - `usedParticipants` deja de ser `0` fijo; usa `participants.length`.
  - `EmptyParticipants` se extiende: si `participants.length > 0`, muestra una tabla (nombre,
    correo, teléfono, fecha); si no, mantiene el estado vacío actual.
  - El modal de invitación reemplaza el texto fijo `cumplimiento.co/juego/próxima-sesión` por el
    link real: `${origin}/juego?org=${organizationId}`.
  - `DashboardProps` gana un campo `organizationId: string` (hoy no se pasa, solo el nombre).

## Manejo de errores

- Link sin `org`, con id inexistente, o con organización de plan inactivo: mismo mensaje genérico
  de "enlace inválido o vencido" en los tres casos (no se distingue el motivo).
- Si `POST /api/participants` falla por red, el juego continúa igual que hoy (`catch` silencioso
  ya existente) — no se bloquea la partida por un fallo de guardado.
- Si `getDb()` (SQLite) falla al leer participantes en `/panel`, se trata como lista vacía (no debe
  romper la carga del panel completo por un problema de la tabla de participantes).

## Fuera de alcance (explícitamente no se hace en este trabajo)

- No se valida en `/api/participants` que el `organizationId` recibido exista realmente en
  Supabase — el gate de validez ya se hizo al servir `/juego`; agregar una segunda validación ahí
  sería redundante para el caso de uso normal (alguien no puede llegar a la pantalla de registro
  sin pasar por la validación de la página).
- No se migra `leads` ni `subscribers` a este esquema de organización — piden un flujo distinto
  (formularios de marketing generales, no ligados a una organización) y no fueron parte del
  reporte original.
- No se agrega paginación a la lista de participantes del panel (se asume volumen bajo dado el
  `participant_limit` de 10–100 por plan).
- No se toca el checkbox de consentimiento del formulario de `/juego` (hoy no está conectado al
  estado `profile` ni se envía al backend); es un problema preexistente, separado de este trabajo.

## Testing

- Build (`pnpm run build`) + smoke test manual: link con `org` válido y plan activo → juego carga
  y el registro llega a SQLite con `organization_id` correcto.
- Link con `org` inexistente y sin `org` → pantalla de error, sin registro posible.
- Organización con plan vencido (`expires_at` en el pasado) → mismo bloqueo.
- `/panel` con al menos un participante registrado → aparece en la pestaña "Participantes" y en el
  conteo del resumen.
- `/panel` sin participantes → se mantiene el estado vacío actual (no debe romperse).
