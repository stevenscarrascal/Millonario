# Conectar participantes de /juego con el panel de organización — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los participantes que se registran vía un link de invitación de `/juego` aparezcan en el panel (`/panel`) de la organización correspondiente, y que el juego rechace links sin organización válida/activa.

**Architecture:** El link de invitación es `/juego?org=<organization.id>`. `/juego` pasa a ser un server component que valida `org` contra una nueva función pública de Supabase (`get_public_organization`, sin requerir sesión) antes de renderizar el juego (que se mueve intacto a un client component nuevo). El registro dentro del juego sigue guardándose en la tabla SQLite local `participants`, que ahora gana una columna `organization_id`. El panel consulta esa misma tabla server-side, filtrando por la organización del usuario logueado, y muestra la lista real en vez del mockup actual.

**Tech Stack:** Next.js App Router (vinext) para las páginas/rutas, Supabase (`@supabase/ssr`, Postgres) para identidad/organización, Drizzle + better-sqlite3 para `participants`.

**Nota sobre testing:** este repo no tiene test runner configurado (no hay Jest/Vitest; el único test existente se eliminó por estar obsoleto — ver `CLAUDE.md`). La verificación de cada tarea es: `pnpm run build` (falla si hay errores de tipos) + comandos concretos de verificación manual (curl, node, SQL) detallados en cada tarea. Si algún comando `pnpm run <script>` falla con `ERR_PNPM_IGNORED_BUILDS`, usar el binario directo en su lugar (ej. `node_modules/.bin/drizzle-kit generate`, `node_modules/.bin/vinext build`) — es un gate de pnpm que ya quedó resuelto una vez (ver `pnpm-workspace.yaml`), no debería reaparecer, pero el binario directo siempre funciona como alternativa.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/schema.sql` | Modificar | Agrega `get_public_organization(org_id)`, única función pensada para llamarse sin sesión (rol `anon`). |
| `db/schema.ts` | Modificar | Agrega columna `organizationId` + índice a la tabla `participants`. |
| `db/index.ts` | Modificar | El bootstrap de arranque crea la columna/índice también en bases de datos SQLite ya existentes (no solo en las nuevas). |
| `drizzle/000N_*.sql` | Crear (generado) | Migración de Drizzle para la columna nueva. |
| `app/api/participants/route.ts` | Modificar | Acepta y guarda `organizationId`. |
| `app/juego/game-client.tsx` | Crear | Todo el juego actual (copiado de `page.tsx`), ahora recibe `organizationId` como prop y lo manda en el registro. |
| `app/juego/page.tsx` | Reemplazar | Pasa a ser server component: valida `?org=` contra Supabase, bloquea o renderiza `GameClient`. |
| `app/panel/page.tsx` | Modificar | Lee los participantes reales de SQLite filtrados por organización, arma el link de invitación, se los pasa a `DashboardClient`. |
| `app/panel/dashboard-client.tsx` | Modificar | Muestra el conteo/lista real de participantes y el link de invitación real (reemplaza el mockup). |

---

## Task 1: Función pública de validación de organización en Supabase

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Agregar la función al final del archivo**

Abrir `supabase/schema.sql` y agregar esto al final (después del bloque de RLS, línea 132):

```sql

-- ---------------------------------------------------------------------------
-- Public organization lookup — used by /juego (sin sesión) para validar el
-- link de invitación (?org=<id>) antes de mostrar el juego. Solo expone lo
-- mínimo necesario (nombre + si el plan está activo); nunca plan, límite de
-- participantes ni fecha de vencimiento exacta.
-- ---------------------------------------------------------------------------

create or replace function public.get_public_organization(org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org record;
begin
  select name, status, expires_at into v_org
  from public.organizations
  where id = org_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'name', v_org.name,
    'is_active', v_org.status = 'active' and (v_org.expires_at is null or v_org.expires_at > now())
  );
end;
$$;

grant execute on function public.get_public_organization(uuid) to anon, authenticated;
```

- [ ] **Step 2: Correr el SQL en Supabase**

En el dashboard de Supabase → SQL Editor → New query → pegar el archivo completo (o solo el bloque nuevo, ya que el resto ya se corrió antes) → Run.

- [ ] **Step 3: Verificar manualmente en el SQL Editor**

```sql
-- Reemplazar por el id real de una organización que exista en tu proyecto
select public.get_public_organization('00000000-0000-0000-0000-000000000000'::uuid);
```

Esperado: si el id no existe, devuelve `null`. Tomá el `id` real de una fila de `organizations`
(`select id, name, status from public.organizations limit 5;`) y volvé a correr la función con ese
id — esperado: `{"name": "...", "is_active": true}` (o `false` si esa organización tiene
`status <> 'active'` o `expires_at` en el pasado).

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add get_public_organization RPC for /juego invite links"
```

---

## Task 2: Columna `organization_id` en la tabla SQLite `participants`

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/index.ts`
- Create: `drizzle/000N_*.sql` (generado por drizzle-kit, nombre exacto no se puede predecir)

- [ ] **Step 1: Agregar la columna e índice en el schema de Drizzle**

En `db/schema.ts`, reemplazar:

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
```

por:

```ts
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
```

Y reemplazar la definición de `participants` (líneas 12-19):

```ts
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  consent: integer("consent", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

por:

```ts
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  consent: integer("consent", { mode: "boolean" }).notNull().default(true),
  organizationId: text("organization_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("participants_organization_id_idx").on(table.organizationId),
]);
```

- [ ] **Step 2: Generar la migración**

Run: `node_modules/.bin/drizzle-kit generate`

Expected: imprime algo como `[✓] Your SQL migration file ➜ drizzle\000N_<nombre-random>.sql 🚀`
(el número `N` sigue después de `0002`, y el nombre es aleatorio — no importa cuál sea).

- [ ] **Step 3: Verificar el contenido de la migración generada**

Leer el archivo nuevo en `drizzle/` (el de mayor número). Debe contener un `ALTER TABLE` que
agrega la columna `organization_id` a `participants` y un `CREATE INDEX` sobre esa columna. Si en
cambio dice `CREATE TABLE` para `participants` desde cero, algo salió mal (probablemente el schema
anterior no se detectó bien) — no continuar sin resolverlo.

- [ ] **Step 4: Hacer que el bootstrap de arranque también actualice bases de datos ya existentes**

`db/index.ts` crea las tablas con `CREATE TABLE IF NOT EXISTS`, lo cual no le agrega la columna
nueva a un archivo `data/app.db` que ya existía de antes (por ejemplo, si ya corriste el servidor
localmente antes de este cambio). Reemplazar el contenido completo de `db/index.ts`:

```ts
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DB_PATH = process.env.SQLITE_DB_PATH || join(process.cwd(), "data", "app.db");

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  organization_id TEXT
);
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  demo_score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS participants_organization_id_idx ON participants (organization_id);
`;

function ensureColumn(sqlite: Database.Database, table: string, column: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((existing) => existing.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec(BOOTSTRAP_SQL);
    ensureColumn(sqlite, "participants", "organization_id", "TEXT");
    sqlite.exec("CREATE INDEX IF NOT EXISTS participants_organization_id_idx ON participants (organization_id)");
    db = drizzle(sqlite, { schema });
  }

  return db;
}
```

- [ ] **Step 5: Verificar que compila**

Run: `node_modules/.bin/vinext build`
Expected: termina con `Build complete. Run \`vinext start\` to start the production server.` sin
errores de TypeScript.

- [ ] **Step 6: Verificar la columna en una base de datos existente (simulando upgrade)**

Este repo probablemente ya tiene un `data/app.db` viejo de pruebas anteriores sin la columna
nueva — es el caso real que `ensureColumn` tiene que resolver. Verificar así:

Run:
```bash
node -e "const Database = require('better-sqlite3'); const db = require('./db/index.ts');" 2>&1 || true
```

Como `db/index.ts` es TypeScript, en su lugar verificar arrancando el server y consultando la
tabla directamente:

Run: `node_modules/.bin/vinext start &` (en background), esperar 2 segundos, luego:

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/app.db');
const cols = db.prepare('PRAGMA table_info(participants)').all().map(c => c.name);
console.log(cols);
if (!cols.includes('organization_id')) { console.error('FALTA organization_id'); process.exit(1); }
console.log('OK: organization_id presente');
"
```

Expected: imprime la lista de columnas incluyendo `organization_id`, y termina con
`OK: organization_id presente`. Después, parar el servidor (buscar el proceso en el puerto 3000 y
matarlo).

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts db/index.ts drizzle/
git commit -m "feat: add organization_id column to participants table"
```

---

## Task 3: La API de participantes guarda `organizationId`

**Files:**
- Modify: `app/api/participants/route.ts`

- [ ] **Step 1: Aceptar y guardar `organizationId`**

Reemplazar el contenido completo de `app/api/participants/route.ts`:

```ts
import { getDb } from "../../../db";
import { participants } from "../../../db/schema";

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; email?: string; phone?: string; organizationId?: string };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const organizationId = body.organizationId?.trim() || null;
  if (!name || !email || !phone || !email.includes("@")) {
    return Response.json({ error: "Datos de registro incompletos" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  await getDb().insert(participants).values({
    id, name: name.slice(0, 120), email: email.slice(0, 180), phone: phone.slice(0, 40), consent: true, organizationId, createdAt: new Date(),
  });
  return Response.json({ id }, { status: 201 });
}
```

- [ ] **Step 2: Verificar que compila**

Run: `node_modules/.bin/vinext build`
Expected: build exitoso, sin errores de tipos.

- [ ] **Step 3: Verificar con una petición real**

Run: `node_modules/.bin/vinext start &` (en background), esperar 2 segundos, luego:

```bash
curl -s -o - -w "\nSTATUS:%{http_code}\n" -X POST http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Org","email":"test-org@example.com","phone":"123","organizationId":"11111111-1111-1111-1111-111111111111"}'
```

Expected: `STATUS:201` con un `{"id": "..."}`.

Luego verificar que quedó guardado con el `organization_id` correcto:

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/app.db');
const row = db.prepare('SELECT email, organization_id FROM participants WHERE email = ?').get('test-org@example.com');
console.log(row);
if (row.organization_id !== '11111111-1111-1111-1111-111111111111') { console.error('organization_id no se guardó bien'); process.exit(1); }
console.log('OK');
"
```

Expected: imprime la fila con `organization_id: '11111111-1111-1111-1111-111111111111'`, termina
en `OK`. Parar el servidor después.

- [ ] **Step 4: Commit**

```bash
git add app/api/participants/route.ts
git commit -m "feat: store organizationId on participant registration"
```

---

## Task 4: Separar `/juego` en validación de servidor + juego de cliente

**Files:**
- Create: `app/juego/game-client.tsx`
- Modify: `app/juego/page.tsx` (reemplazo completo)

- [ ] **Step 1: Copiar el juego actual a un client component nuevo**

Run: `cp app/juego/page.tsx app/juego/game-client.tsx`

- [ ] **Step 2: Cambiar la firma del componente para recibir `organizationId`**

En `app/juego/game-client.tsx`, reemplazar:

```tsx
export default function Home() {
```

por:

```tsx
export default function GameClient({ organizationId }: { organizationId: string }) {
```

- [ ] **Step 3: Mandar `organizationId` en el registro**

En `app/juego/game-client.tsx`, reemplazar la función `register`:

```tsx
  async function register(e: FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/participants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    } catch { /* La experiencia puede continuar si la red está temporalmente fuera. */ }
    setScreen("avatar");
  }
```

por:

```tsx
  async function register(e: FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/participants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, organizationId }) });
    } catch { /* La experiencia puede continuar si la red está temporalmente fuera. */ }
    setScreen("avatar");
  }
```

- [ ] **Step 4: Reemplazar `app/juego/page.tsx` por el nuevo server component**

Reemplazar el contenido completo de `app/juego/page.tsx` (los 546 líneas actuales del juego, que
ahora viven en `game-client.tsx`) por:

```tsx
import { createClient } from "../../lib/supabase/server";
import GameClient from "./game-client";

type PublicOrganization = { name: string; is_active: boolean };

export const dynamic = "force-dynamic";

export default async function JuegoPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const organization = org ? await getPublicOrganization(org) : null;

  if (!organization || !organization.is_active) {
    return (
      <main className="stage-shell">
        <section className="welcome panel">
          <p className="eyebrow">ENLACE NO VÁLIDO</p>
          <h1>Este enlace no es válido o ya venció.</h1>
          <p className="lead">Contacta a quien te invitó para conseguir un enlace de participación vigente.</p>
        </section>
      </main>
    );
  }

  return <GameClient organizationId={org as string} />;
}

async function getPublicOrganization(organizationId: string): Promise<PublicOrganization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_organization", { org_id: organizationId });
  if (error || !data) return null;
  return data as PublicOrganization;
}
```

- [ ] **Step 5: Verificar que compila**

Run: `node_modules/.bin/vinext build`
Expected: build exitoso. Si tira error de tipos en `game-client.tsx`, revisar que el `export
default function GameClient({ organizationId }: { organizationId: string })` haya quedado bien
escrito (es fácil dejar el `Home()` original sin querer si el copy-paste falló).

- [ ] **Step 6: Verificar el bloqueo sin organización**

Run: `node_modules/.bin/vinext start &` (en background), esperar 2 segundos, luego:

```bash
curl -s http://localhost:3000/juego | grep -o "Este enlace no es válido"
```

Expected: imprime `Este enlace no es válido` (sin `?org=`, debe bloquear).

```bash
curl -s "http://localhost:3000/juego?org=00000000-0000-0000-0000-000000000000" | grep -o "Este enlace no es válido"
```

Expected: igual, imprime el mensaje de bloqueo (id que no existe en Supabase).

```bash
curl -s "http://localhost:3000/juego?org=<id-real-de-una-organizacion-activa>" -o /tmp/juego-ok.html -w "%{http_code}\n"
grep -o "ENTRAR AL JUEGO" /tmp/juego-ok.html
```

(Reemplazar `<id-real-de-una-organizacion-activa>` por un id real y activo de `organizations` en
Supabase — el mismo que se usó para probar la función en el Task 1.)
Expected: código 200 y aparece `ENTRAR AL JUEGO` (la pantalla de bienvenida del juego, no el
bloqueo). Parar el servidor después.

- [ ] **Step 7: Commit**

```bash
git add app/juego/page.tsx app/juego/game-client.tsx
git commit -m "feat: require a valid organization invite link to access /juego"
```

---

## Task 5: El panel lee los participantes reales

**Files:**
- Modify: `app/panel/page.tsx`

- [ ] **Step 1: Consultar SQLite y armar el link de invitación**

Reemplazar el contenido completo de `app/panel/page.tsx`:

```tsx
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../../db";
import { participants } from "../../db/schema";
import { createClient } from "../../lib/supabase/server";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

type Organization = { id: string; name: string; plan: string; status: string; participant_limit: number; expires_at: string | null };
type Profile = { full_name: string | null; role: string; organizations: Organization | Organization[] | null };

const planNames: Record<string,string> = { free:"Free", monthly:"Mensual", quarterly:"Trimestral", semiannual:"Semestral", annual:"Anual", premium:"Premium" };

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("full_name, role, organizations(id, name, plan, status, participant_limit, expires_at)").eq("id", user.id).single();
  const profile = data as Profile | null;
  const organizationRaw = profile?.organizations;
  const organization = (Array.isArray(organizationRaw) ? organizationRaw[0] : organizationRaw) || { id:"", name:"Mi organización", plan:"free", status:"active", participant_limit:10, expires_at:null };
  const isActive = organization.status === "active" && (!organization.expires_at || new Date(organization.expires_at) > new Date());

  const organizationParticipants = organization.id ? await getParticipants(organization.id) : [];

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const inviteUrl = organization.id ? `${protocol}://${host}/juego?org=${organization.id}` : "";

  return <DashboardClient
    fullName={profile?.full_name || "Administrador"}
    email={user.email || ""}
    role={profile?.role || "owner"}
    organizationName={organization.name}
    plan={planNames[organization.plan] || organization.plan}
    planCode={organization.plan}
    status={organization.status}
    participantLimit={organization.participant_limit}
    expiresAt={organization.expires_at}
    isActive={isActive}
    organizationId={organization.id}
    inviteUrl={inviteUrl}
    participants={organizationParticipants}
  />;
}

type PanelParticipant = { id: string; name: string; email: string; phone: string; createdAt: string };

async function getParticipants(organizationId: string): Promise<PanelParticipant[]> {
  try {
    const rows = await getDb().select().from(participants).where(eq(participants.organizationId, organizationId)).orderBy(desc(participants.createdAt));
    return rows.map((participant) => ({
      id: participant.id,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      createdAt: participant.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `node_modules/.bin/vinext build`
Expected: en este punto va a fallar porque `DashboardClient` (Task 6) todavía no acepta
`organizationId`, `inviteUrl` ni `participants`. Es esperado — confirmar que el único error de
build es justamente sobre esas props faltantes en `DashboardClient`, no otra cosa. Si el error es
distinto (por ejemplo sobre `getDb`, `participants` o `eq`/`desc`), revisar los imports antes de
seguir al Task 6.

- [ ] **Step 3: Commit**

```bash
git add app/panel/page.tsx
git commit -m "feat: query real participants for the panel from SQLite"
```

(Se commitea aunque el build todavía falle, porque el Task 6 lo termina de resolver en el próximo
commit — son cambios acoplados que solo compilan juntos.)

---

## Task 6: El panel muestra los participantes reales

**Files:**
- Modify: `app/panel/dashboard-client.tsx`

- [ ] **Step 1: Ampliar `DashboardProps` y reemplazar el conteo hardcodeado**

Reemplazar:

```ts
type DashboardProps = {
  fullName: string;
  email: string;
  role: string;
  organizationName: string;
  plan: string;
  planCode: string;
  status: string;
  participantLimit: number;
  expiresAt: string | null;
  isActive: boolean;
};
```

por:

```ts
type Participant = { id: string; name: string; email: string; phone: string; createdAt: string };

type DashboardProps = {
  fullName: string;
  email: string;
  role: string;
  organizationName: string;
  organizationId: string;
  plan: string;
  planCode: string;
  status: string;
  participantLimit: number;
  expiresAt: string | null;
  isActive: boolean;
  inviteUrl: string;
  participants: Participant[];
};
```

- [ ] **Step 2: Reemplazar `usedParticipants` hardcodeado**

Reemplazar:

```ts
  const usedParticipants = 0;
```

por:

```ts
  const usedParticipants = props.participants.length;
```

- [ ] **Step 3: Reemplazar los dos usos de `EmptyParticipants` por `ParticipantsPanel`**

Reemplazar (línea con el tab overview):

```tsx
        <EmptyParticipants onInvite={()=>setInviteOpen(true)} />
```

por:

```tsx
        <ParticipantsPanel participants={props.participants} onInvite={()=>setInviteOpen(true)} />
```

Y reemplazar, dentro del tab `participants`:

```tsx
      {activeTab === "participants" && <section className="tab-screen"><div className="tab-toolbar"><div><small>GESTIÓN DEL EQUIPO</small><h2>Participantes</h2><p>Invita, consulta y administra las personas que pueden participar en tus experiencias.</p></div><button onClick={()=>setInviteOpen(true)}>＋ INVITAR PARTICIPANTES</button></div><div className="participant-summary"><article><b>0</b><span>Registrados</span></article><article><b>{currentPlan.limit}</b><span>Cupos disponibles</span></article><article><b>0%</b><span>Uso del plan</span></article></div><EmptyParticipants onInvite={()=>setInviteOpen(true)} embedded/></section>}
```

por:

```tsx
      {activeTab === "participants" && <section className="tab-screen"><div className="tab-toolbar"><div><small>GESTIÓN DEL EQUIPO</small><h2>Participantes</h2><p>Invita, consulta y administra las personas que pueden participar en tus experiencias.</p></div><button onClick={()=>setInviteOpen(true)}>＋ INVITAR PARTICIPANTES</button></div><div className="participant-summary"><article><b>{usedParticipants}</b><span>Registrados</span></article><article><b>{currentPlan.limit}</b><span>Cupos disponibles</span></article><article><b>{usage}%</b><span>Uso del plan</span></article></div><ParticipantsPanel participants={props.participants} onInvite={()=>setInviteOpen(true)} embedded/></section>}
```

- [ ] **Step 4: Reemplazar el link falso del modal de invitación**

Reemplazar:

```tsx
      {inviteOpen && <div className="invite-modal" role="dialog" aria-modal="true" aria-label="Invitar participantes"><button className="modal-close" onClick={()=>setInviteOpen(false)}>×</button><p>INVITAR PARTICIPANTES</p><h2>Comparte tu próxima experiencia.</h2><span>Cuando actives un juego, aquí aparecerá un enlace único para que tu equipo se registre y participe.</span><div>cumplimiento.co/juego/<b>próxima-sesión</b></div><button onClick={()=>{navigator.clipboard?.writeText("http://localhost:3000/juego"); setInviteOpen(false)}}>COPIAR ENLACE DEL JUEGO →</button></div>}
```

por:

```tsx
      {inviteOpen && <div className="invite-modal" role="dialog" aria-modal="true" aria-label="Invitar participantes"><button className="modal-close" onClick={()=>setInviteOpen(false)}>×</button><p>INVITAR PARTICIPANTES</p><h2>Comparte tu enlace de participación.</h2><span>Cualquier persona con este enlace puede registrarse y jugar como parte de {props.organizationName}.</span><div>{props.inviteUrl}</div><button onClick={()=>{navigator.clipboard?.writeText(props.inviteUrl); setInviteOpen(false)}}>COPIAR ENLACE DEL JUEGO →</button></div>}
```

- [ ] **Step 5: Reemplazar `EmptyParticipants` por `ParticipantsPanel` (con tabla real)**

Reemplazar la función al final del archivo:

```tsx
function EmptyParticipants({ onInvite, embedded = false }: { onInvite: () => void; embedded?: boolean }) {
  return <section className={`dashboard-panel empty-participants ${embedded ? "embedded" : ""}`}><header><div><small>EQUIPO</small><h2>Participantes recientes</h2></div><button onClick={onInvite}>＋ INVITAR PARTICIPANTES</button></header><div><span>◎</span><h3>Aún no hay participantes</h3><p>Invita a tu equipo o comparte el enlace de una experiencia para comenzar.</p><button onClick={onInvite}>PREPARAR INVITACIÓN →</button></div></section>;
}
```

por:

```tsx
function ParticipantsPanel({ participants, onInvite, embedded = false }: { participants: Participant[]; onInvite: () => void; embedded?: boolean }) {
  if (participants.length === 0) {
    return <section className={`dashboard-panel empty-participants ${embedded ? "embedded" : ""}`}><header><div><small>EQUIPO</small><h2>Participantes recientes</h2></div><button onClick={onInvite}>＋ INVITAR PARTICIPANTES</button></header><div><span>◎</span><h3>Aún no hay participantes</h3><p>Invita a tu equipo o comparte el enlace de una experiencia para comenzar.</p><button onClick={onInvite}>PREPARAR INVITACIÓN →</button></div></section>;
  }
  return <section className={`dashboard-panel participants-list ${embedded ? "embedded" : ""}`}>
    <header><div><small>EQUIPO</small><h2>Participantes recientes</h2></div><button onClick={onInvite}>＋ INVITAR PARTICIPANTES</button></header>
    <table>
      <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Fecha</th></tr></thead>
      <tbody>{participants.map((participant) => <tr key={participant.id}><td>{participant.name}</td><td>{participant.email}</td><td>{participant.phone}</td><td>{new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(participant.createdAt))}</td></tr>)}</tbody>
    </table>
  </section>;
}
```

- [ ] **Step 6: Verificar que compila**

Run: `node_modules/.bin/vinext build`
Expected: build exitoso, sin errores de tipos (ahora sí, junto con el Task 5).

- [ ] **Step 7: Commit**

```bash
git add app/panel/dashboard-client.tsx
git commit -m "feat: show real participant list and invite link in the panel"
```

---

## Task 7: Verificación manual de punta a punta

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Preparar datos de prueba**

En el SQL Editor de Supabase, confirmar que tenés al menos una organización activa y anotar su
`id`:

```sql
select id, name, status, expires_at from public.organizations where status = 'active' limit 1;
```

- [ ] **Step 2: Arrancar el servidor de producción local**

```bash
rm -rf data
node_modules/.bin/vinext build
node_modules/.bin/vinext start &
sleep 2
```

- [ ] **Step 3: Registrar un participante como lo haría alguien real**

Abrir en el navegador: `http://localhost:3000/juego?org=<id-de-la-organizacion-activa>`

- Debe verse la pantalla de bienvenida del juego (no el bloqueo).
- Click "ENTRAR AL JUEGO", completar el formulario de registro (nombre/correo/teléfono), continuar
  hasta la selección de avatar.

- [ ] **Step 4: Confirmar que llegó a SQLite con la organización correcta**

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/app.db');
const rows = db.prepare('SELECT name, email, organization_id FROM participants ORDER BY created_at DESC LIMIT 1').all();
console.log(rows);
"
```

Expected: la fila más reciente tiene el `organization_id` que usaste en la URL.

- [ ] **Step 5: Iniciar sesión en el panel de esa misma organización y confirmar que aparece**

Iniciar sesión en `http://localhost:3000/login` con una cuenta que pertenezca a esa organización
(la misma cuya `id` usaste en el link). Entrar a `/panel` → pestaña "Participantes".

Expected: aparece el participante recién registrado (nombre, correo, teléfono, fecha), y el
conteo "PARTICIPANTES REGISTRADOS" del resumen ya no dice 0.

- [ ] **Step 6: Confirmar el bloqueo con link inválido**

Abrir `http://localhost:3000/juego` (sin `?org=`) y `http://localhost:3000/juego?org=00000000-0000-0000-0000-000000000000`
(id inexistente). Ambos deben mostrar la pantalla "Este enlace no es válido o ya venció.", sin
poder llegar al juego.

- [ ] **Step 7: Parar el servidor y limpiar**

En Windows (PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

En Linux/macOS:

```bash
kill $(lsof -t -i:3000)
```

Luego, en cualquier sistema:

```bash
rm -rf data dist
```

No hay commit en esta tarea — es solo verificación de que todo lo anterior funciona junto.
