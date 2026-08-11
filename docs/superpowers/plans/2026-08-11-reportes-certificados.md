# Reportes y certificados en el panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the real result of each `/juego` playthrough, surface it in the organization's
`/panel` (reports table, overview metrics, CSV export), and let both the participant (from the
game's end screen) and the org admin (from the panel) download a PDF certificate for anyone who
reaches at least the AVANZADO level.

**Architecture:** Extend the existing `participants` SQLite table with 4 result columns
(`finishedAt`, `winningsPoints`, `level`, `masteryPercent`) instead of adding a new table — one
participant row already represents exactly one playthrough. A single pure function
(`isCertificateEligible`) is the one source of truth for "who gets a certificate," reused by the
game's end screen, the panel's Certificados tab, and the PDF endpoint's own server-side check.
Certificates render server-side via `@react-pdf/renderer` (pure JS, no Chromium) behind an
unauthenticated `GET /api/certificates/[id]` route — same security model as the existing public
`/juego?org=` invite link (unguessable UUID, no sensitive data exposed).

**Tech Stack:** Next.js App Router route handlers (Node runtime, not edge), Drizzle ORM +
better-sqlite3, `@react-pdf/renderer` (new dependency), plain client-side CSV export (no new
authenticated endpoint).

**No test suite exists in this repo** (see `CLAUDE.md`) — `vinext build` does not type-check.
Every task below is verified with `node_modules/.bin/tsc --noEmit` (real type-check) +
`node_modules/.bin/vinext build` (confirms the production bundle compiles) + a manual functional
check against the running app (`curl` for API routes, Playwright for UI), matching this repo's
established verification pattern from prior features.

---

### Task 1: Extend the `participants` table with result columns

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/index.ts`

- [ ] **Step 1: Add the 4 new columns to the Drizzle schema**

In `db/schema.ts`, replace the `participants` table definition:

```ts
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  consent: integer("consent", { mode: "boolean" }).notNull().default(true),
  organizationId: text("organization_id"),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  winningsPoints: integer("winnings_points"),
  level: text("level"),
  masteryPercent: integer("mastery_percent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("participants_organization_id_idx").on(table.organizationId),
]);
```

- [ ] **Step 2: Add matching columns to `BOOTSTRAP_SQL` and the upgrade path**

In `db/index.ts`, update the `participants` table inside `BOOTSTRAP_SQL` (for brand-new
databases) to include the same 4 columns:

```sql
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  organization_id TEXT,
  finished_at INTEGER,
  winnings_points INTEGER,
  level TEXT,
  mastery_percent INTEGER
);
```

Then, in `getDb()`, add `ensureColumn` calls for pre-existing databases (SQLite files created
before this change) right after the existing `organization_id` one, keeping the index creation
call **after** all `ensureColumn` calls (this ordering matters — an earlier bug had the index
created before a required column existed on upgrade, crashing `getDb()`):

```ts
    ensureColumn(sqlite, "participants", "organization_id", "TEXT");
    ensureColumn(sqlite, "participants", "finished_at", "INTEGER");
    ensureColumn(sqlite, "participants", "winnings_points", "INTEGER");
    ensureColumn(sqlite, "participants", "level", "TEXT");
    ensureColumn(sqlite, "participants", "mastery_percent", "INTEGER");
    sqlite.exec("CREATE INDEX IF NOT EXISTS participants_organization_id_idx ON participants (organization_id)");
```

- [ ] **Step 3: Regenerate the Drizzle migration history**

Run: `pnpm run db:generate`
Expected: a new file appears under `drizzle/` (e.g. `0004_*.sql`) with 4 `ALTER TABLE
participants ADD COLUMN ...` statements, plus a matching `drizzle/meta/0004_snapshot.json`.

- [ ] **Step 4: Verify the schema compiles and the upgrade path works on a real file**

```bash
node_modules/.bin/tsc --noEmit
rm -f data/app.db data/app.db-wal data/app.db-shm
node_modules/.bin/vinext build
node_modules/.bin/vinext start &
sleep 2
curl -s -X POST http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{"name":"Verificación Tarea 1","email":"t1@proderi.com","phone":"3000000000"}'
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/app.db');
console.log(db.prepare('PRAGMA table_info(participants)').all().map(c => c.name));
"
kill %1
```

Expected: the `curl` returns `{"id":"..."}` (HTTP 201), and the `PRAGMA table_info` output
includes `finished_at`, `winnings_points`, `level`, `mastery_percent` alongside the existing
columns.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/index.ts drizzle/
git commit -m "feat: add result columns to participants table"
```

---

### Task 2: Certificate eligibility helper

**Files:**
- Create: `lib/certificates.ts`

- [ ] **Step 1: Write the shared eligibility function**

```ts
export const GAME_LEVELS = [
  "INTERMEDIO",
  "AVANZADO",
  "ESPECIALISTA",
  "EXPERTO",
  "EXPERTO INTERNACIONAL",
] as const;

export type GameLevel = typeof GAME_LEVELS[number];

export function isCertificateEligible(level: string | null | undefined): boolean {
  if (!level) return false;
  return (GAME_LEVELS as readonly string[]).includes(level) && level !== "INTERMEDIO";
}
```

This is the single source of truth for "who gets a certificate" — reused by the game's end
screen (Task 7), the panel's Certificados tab (Task 10), and the PDF endpoint's own server-side
recheck (Task 6). A participant only has a non-null `level` once they've actually finished a
game (Task 3/4 set `level` and `finishedAt` together), so checking `level` alone already implies
"finished."

- [ ] **Step 2: Verify it compiles**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors. (Behavior is exercised end-to-end once Tasks 3–10 wire it in — there's no
test runner in this repo to unit-test it in isolation.)

- [ ] **Step 3: Commit**

```bash
git add lib/certificates.ts
git commit -m "feat: add certificate eligibility helper"
```

---

### Task 3: API endpoint to record a finished game's result

**Files:**
- Create: `app/api/participants/[id]/route.ts`

- [ ] **Step 1: Write the PATCH handler**

```ts
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { participants } from "../../../../db/schema";
import { GAME_LEVELS } from "../../../../lib/certificates";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { winningsPoints?: number; level?: string; masteryPercent?: number };
  const winningsPoints = Number(body.winningsPoints);
  const masteryPercent = Number(body.masteryPercent);
  const level = body.level;

  if (!Number.isFinite(winningsPoints) || !Number.isFinite(masteryPercent) || !level || !(GAME_LEVELS as readonly string[]).includes(level)) {
    return Response.json({ error: "Datos de resultado inválidos" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.select({ id: participants.id }).from(participants).where(eq(participants.id, id));
  if (existing.length === 0) {
    return Response.json({ error: "Participante no encontrado" }, { status: 404 });
  }

  await db.update(participants).set({
    finishedAt: new Date(),
    winningsPoints: Math.round(winningsPoints),
    level,
    masteryPercent: Math.max(0, Math.min(100, Math.round(masteryPercent))),
  }).where(eq(participants.id, id));

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify the endpoint end-to-end**

```bash
node_modules/.bin/vinext build
node_modules/.bin/vinext start &
sleep 2
PID=$(curl -s -X POST http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{"name":"Verificación Tarea 3","email":"t3@proderi.com","phone":"3000000000"}' | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).id))")
curl -s -X PATCH http://localhost:3000/api/participants/$PID \
  -H "Content-Type: application/json" \
  -d '{"winningsPoints":32000,"level":"ESPECIALISTA","masteryPercent":68}'
curl -s -X PATCH http://localhost:3000/api/participants/does-not-exist \
  -H "Content-Type: application/json" \
  -d '{"winningsPoints":100,"level":"AVANZADO","masteryPercent":10}'
curl -s -X PATCH http://localhost:3000/api/participants/$PID \
  -H "Content-Type: application/json" \
  -d '{"winningsPoints":100}'
kill %1
```

Expected: first PATCH → `{"ok":true}` (200); second (unknown id) → `{"error":"Participante no
encontrado"}` (404); third (missing `level`) → `{"error":"Datos de resultado inválidos"}` (400).

- [ ] **Step 4: Commit**

```bash
git add app/api/participants/\[id\]/route.ts
git commit -m "feat: add endpoint to record a participant's game result"
```

---

### Task 4: Submit the real result from the game

**Files:**
- Modify: `app/juego/game-client.tsx`

- [ ] **Step 1: Capture the participant id on registration**

Add a new state variable near the other `useState` declarations (after the `avatar` state,
around line 198):

```ts
  const [participantId, setParticipantId] = useState<string | null>(null);
```

Then change `register()` (currently discards the fetch response) to capture the returned id:

```ts
  async function register(e: FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/participants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, organizationId }) });
      if (response.ok) {
        const data = await response.json() as { id: string };
        setParticipantId(data.id);
      }
    } catch { /* La experiencia puede continuar si la red está temporalmente fuera. */ }
    setScreen("avatar");
  }
```

- [ ] **Step 2: Submit the result when the game finishes**

Change `finish(title, amount = winnings)` to also PATCH the result (best-effort — if
`participantId` is `null`, because registration failed earlier, skip silently and don't block the
end screen):

```ts
  function finish(title: string, amount = winnings) {
    stopMusic();
    if (amount === "1.000.000") cue("million-win", "win"); else cue("game-over", "wrong");
    setEndTitle(title); setWinnings(amount); setScreen("end");
    if (participantId) {
      const winningsPoints = Number(amount.replace(/\./g, ""));
      const masteryPercent = Math.min(100, Math.round(mastery / 2.2));
      fetch(`/api/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winningsPoints, level, masteryPercent }),
      }).catch(() => undefined);
    }
  }
```

`level` here is the `useMemo` value already computed from `current` (line 222) — at the moment
`finish` runs, `current` still holds the index of the question the player was on (whether they
just answered it wrong, or clicked "RETIRARME" before answering), so `level` accurately reflects
the tier reached.

- [ ] **Step 3: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify end-to-end with Playwright**

Reuse the pattern from this session's earlier verification scripts (e.g.
`play-through-avatar-end.js` in the scratchpad). Write a script that:
1. Registers, picks an avatar, starts the game.
2. Clicks "RETIRARME" (`button:has-text("RETIRARME")`) immediately — this should PATCH with
   `level: "INTERMEDIO"`.
3. Reads `data/app.db` afterward (via the `better-sqlite3` one-liner from Task 1 Step 4) and
   confirms the row for that participant's email now has `finished_at` set and
   `level = 'INTERMEDIO'`.

Expected: the row shows a non-null `finished_at`, `winnings_points = 0`, `level = 'INTERMEDIO'`,
and a `mastery_percent` of `0`.

- [ ] **Step 5: Commit**

```bash
git add app/juego/game-client.tsx
git commit -m "feat: submit game result to the server when a playthrough finishes"
```

---

### Task 5: Shared organization-name lookup

**Files:**
- Create: `lib/organizations.ts`
- Modify: `app/juego/page.tsx`

The certificate PDF (Task 6) needs the organization's display name given only the
`organizationId` stored on the participant row. `app/juego/page.tsx` already has this exact
lookup (via the public `get_public_organization` RPC) — extract it into a shared helper instead
of duplicating it.

- [ ] **Step 1: Extract the helper**

```ts
import { createClient } from "./supabase/server";

export type PublicOrganization = { name: string; is_active: boolean };

export async function getPublicOrganization(organizationId: string): Promise<PublicOrganization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_organization", { org_id: organizationId });
  if (error || !data) return null;
  return data as PublicOrganization;
}
```

- [ ] **Step 2: Update `app/juego/page.tsx` to use it**

Remove the local `PublicOrganization` type and `getPublicOrganization` function
(currently lines 4 and 27–32), and add an import instead:

```ts
import { getPublicOrganization } from "../../lib/organizations";
```

The rest of `app/juego/page.tsx` (the `JuegoPage` component body) stays unchanged — it already
calls `getPublicOrganization(org)`.

- [ ] **Step 3: Verify**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

Run: `node_modules/.bin/vinext build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/organizations.ts app/juego/page.tsx
git commit -m "refactor: extract shared organization lookup helper"
```

---

### Task 6: PDF certificate generation endpoint

**Files:**
- Modify: `package.json` (new dependency)
- Modify: `next.config.ts`
- Create: `app/api/certificates/certificate-pdf.tsx`
- Create: `app/api/certificates/[id]/route.ts`

- [ ] **Step 1: Add the dependency**

Run: `pnpm add @react-pdf/renderer`
Expected: `package.json` `dependencies` gains `"@react-pdf/renderer": "^..."`.

- [ ] **Step 2: Pre-emptively externalize it, matching the `better-sqlite3` precedent**

`@react-pdf/renderer` loads a WASM layout engine from disk relative to its own package
directory — the same class of problem documented in `next.config.ts` for `better-sqlite3`
(`__dirname`-based lookups break once esbuild bundles the package into the ESM server chunk).
Add it to `serverExternalPackages` up front instead of debugging the same failure mode again:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon; @react-pdf/renderer loads a WASM layout
  // engine from disk relative to its own package dir — both must stay a live
  // `require()` at runtime instead of being bundled, or their __dirname-based
  // lookups break inside the ESM server bundle.
  serverExternalPackages: ["better-sqlite3", "@react-pdf/renderer"],
};

export default nextConfig;
```

- [ ] **Step 3: Write the certificate PDF component**

```tsx
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  border: { flex: 1, borderWidth: 3, borderColor: "#f2ae32", padding: 40, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: "#8190b6", marginBottom: 18 },
  title: { fontSize: 28, color: "#0b1533", marginBottom: 6, textAlign: "center" },
  name: { fontSize: 22, color: "#0b1533", marginTop: 22, marginBottom: 4, textAlign: "center" },
  org: { fontSize: 12, color: "#4c6683", marginBottom: 22, textAlign: "center" },
  result: { fontSize: 14, color: "#8f6a12", marginBottom: 30, textAlign: "center" },
  date: { fontSize: 10, color: "#4c6683", marginBottom: 4 },
  code: { fontSize: 8, color: "#8190b6", position: "absolute", bottom: 24, right: 40 },
});

export type CertificateData = {
  participantId: string;
  participantName: string;
  organizationName: string;
  level: string;
  winningsPoints: number;
  finishedAt: Date;
};

export function CertificateDocument({ data }: { data: CertificateData }) {
  const formattedDate = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(data.finishedAt);
  const formattedPoints = new Intl.NumberFormat("es-CO").format(data.winningsPoints);
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.eyebrow}>CERTIFICADO DE PARTICIPACIÓN</Text>
          <Text style={styles.title}>El Reto Internacional de Cumplimiento</Text>
          <Text style={styles.name}>{data.participantName}</Text>
          <Text style={styles.org}>{data.organizationName}</Text>
          <Text style={styles.result}>Nivel alcanzado: {data.level} · {formattedPoints} puntos</Text>
          <Text style={styles.date}>Finalizado el {formattedDate}</Text>
          <Text style={styles.code}>Código de verificación: {data.participantId}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 4: Write the GET endpoint**

```tsx
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDb } from "../../../../db";
import { participants } from "../../../../db/schema";
import { isCertificateEligible } from "../../../../lib/certificates";
import { getPublicOrganization } from "../../../../lib/organizations";
import { CertificateDocument } from "../certificate-pdf";

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await getDb().select().from(participants).where(eq(participants.id, id));
  const participant = rows[0];

  if (!participant || !participant.finishedAt || !isCertificateEligible(participant.level)) {
    return new Response("Certificado no disponible", { status: 404 });
  }

  const organization = participant.organizationId ? await getPublicOrganization(participant.organizationId) : null;

  const buffer = await renderToBuffer(
    <CertificateDocument
      data={{
        participantId: participant.id,
        participantName: participant.name,
        organizationName: organization?.name || "Cumplimiento",
        level: participant.level as string,
        winningsPoints: participant.winningsPoints ?? 0,
        finishedAt: participant.finishedAt,
      }}
    />
  );

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${slugify(participant.name)}.pdf"`,
    },
  });
}
```

- [ ] **Step 5: Verify types and build**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

Run: `node_modules/.bin/vinext build`
Expected: build succeeds. If it fails with an error mentioning a `.wasm` file or module
resolution inside `@react-pdf`-related packages, that confirms the bundling problem anticipated
in Step 2 — double-check `serverExternalPackages` was saved correctly and re-run the build.

- [ ] **Step 6: Verify end-to-end**

```bash
node_modules/.bin/vinext start &
sleep 2
PID=$(curl -s -X POST http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{"name":"Verificación Tarea 6","email":"t6@proderi.com","phone":"3000000000"}' | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).id))")
curl -s -X PATCH http://localhost:3000/api/participants/$PID \
  -H "Content-Type: application/json" \
  -d '{"winningsPoints":32000,"level":"ESPECIALISTA","masteryPercent":68}'
curl -s -o /tmp-cert-ok.pdf -w "%{http_code}\n" http://localhost:3000/api/certificates/$PID
head -c 4 /tmp-cert-ok.pdf
echo
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/certificates/does-not-exist
kill %1
```

Expected: the first `curl` reports `200` and `/tmp-cert-ok.pdf`'s first 4 bytes are `%PDF`; the
second `curl` (unknown id) reports `404`. Use this repo's actual scratchpad path instead of
`/tmp-cert-ok.pdf` if running from PowerShell.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts app/api/certificates/
git commit -m "feat: generate PDF certificates for eligible participants"
```

---

### Task 7: Certificate download button on the game's end screen

**Files:**
- Modify: `app/juego/game-client.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Import the eligibility helper**

Add near the top of `app/juego/game-client.tsx`, alongside the existing imports:

```ts
import { isCertificateEligible } from "../../lib/certificates";
```

- [ ] **Step 2: Add the download link to the end screen**

Change the `screen === "end"` block (currently ends with just the "JUGAR DE NUEVO" button):

```tsx
      {screen === "end" && <section className={`end panel ${winnings === "1.000.000" ? "win" : "lose"}`}>
        <p className="eyebrow">PARTIDA FINALIZADA</p><h2>{endTitle}</h2><Avatar index={avatar} /><h3>{profile.name}</h3>
        <div className="final-score">
          <i className="accent-bar" />
          <small>RESULTADO FINAL</small>
          <b>{winnings}</b>
          <span>PUNTOS</span>
          <div className="score-bar"><i style={{ width: `${Math.min(100, Math.round(mastery / 2.2))}%` }} /></div>
          <div className="end-stats"><span>{level}</span><span>Índice de dominio: {Math.min(100, Math.round(mastery / 2.2))}%</span></div>
        </div>
        <button className="primary" onClick={restart}>JUGAR DE NUEVO <span>↻</span></button>
        {participantId && isCertificateEligible(level) && <a className="certificate-download" href={`/api/certificates/${participantId}`}>DESCARGAR CERTIFICADO ↓</a>}
      </section>}
```

- [ ] **Step 3: Style the link**

In `app/globals.css`, find the line starting with `.end .avatar { transform:scale(.75); ...`
(the `.end`/`.final-score` rules) and append at the end of that same line:

```css
.end .certificate-download { display:inline-block; margin-top:14px; color:#f0bd54; font-size:9px; font-weight:700; letter-spacing:1px; text-decoration:none; }.end .certificate-download:hover { text-decoration:underline; }
```

Then find the line `html[data-theme="light"] .stage-shell:not(.game-active) .end.lose
.final-score b { color:#3c5878; }` and add a new line immediately after it:

```css
html[data-theme="light"] .stage-shell:not(.game-active) .end .certificate-download { color:#a9781b; }
```

- [ ] **Step 4: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify with Playwright, in both themes and both eligibility states**

Write a script (following the pattern of this session's earlier `play-through-*.js` scratchpad
scripts) that:
1. Plays through, answering the first 4 questions correctly (reaching `current >= 3`, i.e.
   level `AVANZADO` or higher) before retiring — confirms the "DESCARGAR CERTIFICADO" link is
   present and its `href` matches `/api/certificates/{id}`.
2. Registers a second participant and retires immediately on question 1 (`current === 0`, level
   `INTERMEDIO`) — confirms the link is **absent**.
3. Repeats check 1 after toggling `.theme-toggle` (light theme) — confirms the link is still
   visible and legible (not invisible-on-background).

Screenshot each state and read the screenshots to confirm visually.

- [ ] **Step 6: Commit**

```bash
git add app/juego/game-client.tsx app/globals.css
git commit -m "feat: add certificate download link to the game's end screen"
```

---

### Task 8: Load result columns into the panel

**Files:**
- Modify: `app/panel/page.tsx`

- [ ] **Step 1: Extend the participant type and query**

Replace the `PanelParticipant` type and `getParticipants` function:

```ts
type PanelParticipant = { id: string; name: string; email: string; phone: string; createdAt: string; finishedAt: string | null; winningsPoints: number | null; level: string | null; masteryPercent: number | null };

async function getParticipants(organizationId: string): Promise<PanelParticipant[]> {
  try {
    const rows = await getDb().select().from(participants).where(eq(participants.organizationId, organizationId)).orderBy(desc(participants.createdAt));
    return rows.map((participant) => ({
      id: participant.id,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      createdAt: participant.createdAt.toISOString(),
      finishedAt: participant.finishedAt ? participant.finishedAt.toISOString() : null,
      winningsPoints: participant.winningsPoints,
      level: participant.level,
      masteryPercent: participant.masteryPercent,
    }));
  } catch {
    return [];
  }
}
```

The rest of the file (the `PanelPage` component, the `DashboardClient` call) is unchanged — it
already passes the whole `organizationParticipants` array through as `participants`.

- [ ] **Step 2: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: an error in `app/panel/dashboard-client.tsx` — its local `Participant` type doesn't
have the new fields yet. That's expected; Task 9 fixes it. Confirm the error is specifically a
type mismatch on `participants` prop, not something else.

- [ ] **Step 3: Commit**

```bash
git add app/panel/page.tsx
git commit -m "feat: load game result columns into the panel query"
```

---

### Task 9: Real "Reportes" tab, CSV export, and overview metrics

**Files:**
- Modify: `app/panel/dashboard-client.tsx`

- [ ] **Step 1: Extend the `Participant` type and add the eligibility import**

```ts
import { isCertificateEligible } from "../../lib/certificates";
```

```ts
type Participant = { id: string; name: string; email: string; phone: string; createdAt: string; finishedAt: string | null; winningsPoints: number | null; level: string | null; masteryPercent: number | null };
```

- [ ] **Step 2: Add formatting helpers and derived data**

Add these module-level helper functions (near `formatExpiry`):

```ts
function formatPoints(value: number | null) {
  return value == null ? "—" : new Intl.NumberFormat("es-CO").format(value);
}
function formatMastery(value: number | null) {
  return value == null ? "—" : `${value}%`;
}
function formatFinished(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function downloadReportCsv(participants: Participant[], organizationName: string) {
  const header = ["Nombre", "Correo", "Nivel", "Puntos", "% Dominio", "Fecha", "Certificado"];
  const rows = participants.filter(p => p.finishedAt).map(p => [
    p.name, p.email, p.level ?? "", String(p.winningsPoints ?? ""), String(p.masteryPercent ?? ""),
    formatFinished(p.finishedAt), isCertificateEligible(p.level) ? "Sí" : "No",
  ]);
  const csv = [header, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte-${slugify(organizationName)}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

Inside `DashboardClient`, after the existing `const usedParticipants = ...` line, add:

```ts
  const finishedParticipants = props.participants.filter(p => p.finishedAt);
  const certifiedParticipants = props.participants.filter(p => isCertificateEligible(p.level));
  const averageMastery = finishedParticipants.length
    ? Math.round(finishedParticipants.reduce((sum, p) => sum + (p.masteryPercent ?? 0), 0) / finishedParticipants.length)
    : null;
```

- [ ] **Step 3: Wire the overview metrics to real data**

In the `metric-grid` block (inside `activeTab === "overview"`), replace the 3 hardcoded metrics:

```tsx
<div className="metric-grid"><article><small>PARTICIPANTES REGISTRADOS</small><b>{usedParticipants}</b><span>de {currentPlan.limit} disponibles</span><div><i style={{width:`${usage}%`}}/></div></article><article><small>EXPERIENCIAS REALIZADAS</small><b>{finishedParticipants.length}</b><span>{finishedParticipants.length === 0 ? "Comienza tu primera activación" : "Partidas completadas"}</span><em>↗</em></article><article><small>PROMEDIO DE CONOCIMIENTO</small><b>{averageMastery == null ? "—" : `${averageMastery}%`}</b><span>{averageMastery == null ? "Aparecerá después del primer juego" : "Índice de dominio promedio"}</span><em>◎</em></article><article><small>CERTIFICADOS EMITIDOS</small><b>{certifiedParticipants.length}</b><span>Disponibles según tu plan</span><em>◆</em></article></div>
```

- [ ] **Step 4: Add the `ReportsPanel` component**

Add this new component after `ParticipantsPanel`:

```tsx
function ReportsPanel({ participants }: { participants: Participant[] }) {
  const finished = participants.filter(p => p.finishedAt);
  if (finished.length === 0) {
    return <div className="report-placeholder"><div className="fake-chart"><i/><i/><i/><i/><i/><i/><i/></div><span>▥</span><h3>Tu primer reporte aparecerá aquí</h3><p>Los resultados se consolidan automáticamente después de cada experiencia.</p><a href="/juego">INICIAR UNA EXPERIENCIA →</a></div>;
  }
  return <section className="dashboard-panel participants-list embedded">
    <table>
      <thead><tr><th>Nombre</th><th>Correo</th><th>Nivel</th><th>Puntos</th><th>% Dominio</th><th>Fecha</th><th>Certificado</th></tr></thead>
      <tbody>{finished.map((participant) => <tr key={participant.id}>
        <td>{participant.name}</td><td>{participant.email}</td><td>{participant.level}</td>
        <td>{formatPoints(participant.winningsPoints)}</td><td>{formatMastery(participant.masteryPercent)}</td>
        <td>{formatFinished(participant.finishedAt)}</td>
        <td>{isCertificateEligible(participant.level) ? <b className="status-active">✓</b> : <b className="status-expired">—</b>}</td>
      </tr>)}</tbody>
    </table>
  </section>;
}
```

- [ ] **Step 5: Wire up the "Reportes" tab**

Replace the `activeTab === "reports"` block:

```tsx
      {activeTab === "reports" && <section className="tab-screen"><div className="tab-toolbar"><div><small>ANÁLISIS DE DESEMPEÑO</small><h2>Reportes</h2><p>Conoce fortalezas, brechas y evolución del conocimiento de tu equipo.</p></div><button disabled={finishedParticipants.length === 0} onClick={() => downloadReportCsv(props.participants, props.organizationName)}>EXPORTAR REPORTE</button></div><ReportsPanel participants={props.participants} /></section>}
```

- [ ] **Step 6: Verify types and build**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors (this resolves the type error left open at the end of Task 8).

Run: `node_modules/.bin/vinext build`
Expected: build succeeds.

- [ ] **Step 7: Verify end-to-end with Playwright**

Log into `/panel` with a real Supabase test account tied to an organization that has at least
one finished participant (reuse a participant created/finished in Task 4/6/7's verification
runs, or play through `/juego?org=<that org's id>` once more). Navigate to the "Reportes" tab,
screenshot it, and confirm: the table shows real rows (not the placeholder), the "EXPORTAR
REPORTE" button is enabled, and clicking it triggers a CSV download (Playwright's
`page.waitForEvent('download')`) — read the downloaded file's contents and confirm it has a
header row and one data row per finished participant. Also verify the overview tab's 3 metrics
now show non-placeholder numbers.

- [ ] **Step 8: Commit**

```bash
git add app/panel/dashboard-client.tsx
git commit -m "feat: real reports table, CSV export, and live overview metrics"
```

---

### Task 10: Real "Certificados" tab

**Files:**
- Modify: `app/panel/dashboard-client.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Wire the certificate count and add the download list**

Replace the `activeTab === "certificates"` block:

```tsx
      {activeTab === "certificates" && <section className="tab-screen"><div className="tab-toolbar"><div><small>RECONOCIMIENTO</small><h2>Certificados</h2><p>Emite y consulta certificados para quienes completen los retos definidos.</p></div><button disabled>CONFIGURAR PLANTILLA</button></div><div className="certificate-preview"><div><span>C</span><small>CERTIFICADO DE PARTICIPACIÓN</small><h3>Compliance Challenge</h3><i>Otorgado por completar satisfactoriamente<br/>la experiencia internacional de cumplimiento.</i><b>{props.organizationName}</b></div><aside><span>{certifiedParticipants.length}</span><h3>Certificados emitidos</h3><p>{certifiedParticipants.length === 0 ? "Cuando tus participantes completen una experiencia aparecerán aquí." : "Descarga el certificado de cada participante desde la lista de abajo."}</p></aside></div>{certifiedParticipants.length > 0 && <section className="dashboard-panel participants-list embedded"><table><thead><tr><th>Nombre</th><th>Nivel</th><th>Puntos</th><th>Fecha</th><th></th></tr></thead><tbody>{certifiedParticipants.map((participant) => <tr key={participant.id}><td>{participant.name}</td><td>{participant.level}</td><td>{formatPoints(participant.winningsPoints)}</td><td>{formatFinished(participant.finishedAt)}</td><td><a className="download-link" href={`/api/certificates/${participant.id}`}>DESCARGAR →</a></td></tr>)}</tbody></table></section>}</section>}
```

- [ ] **Step 2: Style the download link**

In `app/globals.css`, find the line `.participants-list tr:last-child td { border-bottom:0; }`
and add a new line immediately after it:

```css
.participants-list td a.download-link { display:inline-block; padding:6px 12px; border:1px solid #4b6d97; border-radius:6px; color:#9bcbff; font-size:8px; font-weight:bold; letter-spacing:.5px; text-decoration:none; }
```

Then find the line `html[data-theme="light"] .participants-list td { color:#1d3657; }` and add a
new line immediately after it:

```css
html[data-theme="light"] .participants-list td a.download-link { border-color:#8fb4d8; color:#1f5c96; }
```

- [ ] **Step 3: Verify types and build**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

Run: `node_modules/.bin/vinext build`
Expected: build succeeds.

- [ ] **Step 4: Verify end-to-end with Playwright**

On the same logged-in `/panel` session used in Task 9, open the "Certificados" tab, screenshot
it, and confirm: the counter shows the real count (not `0`), and there's one row per eligible
participant with a "DESCARGAR →" link. Click one and confirm (via `page.waitForEvent('download')`
or by checking the response `Content-Type`) that it downloads a PDF, not an error page. Repeat
in light theme and confirm the download link is legible on the light background.

- [ ] **Step 5: Commit**

```bash
git add app/panel/dashboard-client.tsx app/globals.css
git commit -m "feat: real certificates list with per-participant PDF download"
```

---

## Post-plan cleanup

After Task 10's verification, stop any running dev/prod server, remove test data created during
verification if it's not useful to keep (`rm -f data/app.db data/app.db-wal data/app.db-shm`, or
leave it if the user wants to keep browsing the panel with real-looking data), and run the full
verification one more time from a clean state:

```bash
node_modules/.bin/tsc --noEmit
node_modules/.bin/vinext build
```
