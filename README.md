# Cumplimiento

Sitio de marketing + juego de formación en compliance ("El Reto Internacional"),
construido con [vinext](https://github.com/cloudflare/vinext) (Next.js App Router
sobre Vite) corriendo como servidor Node.js estándar — sin Cloudflare Workers.

## Prerequisitos

- Node.js `>=22.13.0`
- pnpm (`packageManager: pnpm@11.9.0`)
- Un proyecto de [Supabase](https://supabase.com) (auth + `profiles`/`organizations`)

## Quick start (local)

```bash
pnpm install
pnpm run dev
```

Copia `.env.example` a `.env.local` y completa las credenciales de Supabase antes
de arrancar. Si es un proyecto de Supabase nuevo (vacío), corré primero
`supabase/schema.sql` — ver sección "Base de datos de Supabase" abajo.

## Comandos

- `pnpm run dev` — desarrollo local
- `pnpm run build` — build de producción (Node, no Cloudflare)
- `pnpm run start` — levanta el servidor de producción ya compilado (usa `PORT`, default `3000`)
- `pnpm run lint` — ESLint
- `pnpm run db:generate` — regenera migraciones de Drizzle tras editar `db/schema.ts`

## Base de datos de Supabase

`profiles`, `organizations` y la función `activate_preview_plan` no se crean solas: hay
que correr `supabase/schema.sql` una vez contra tu proyecto de Supabase (Studio →
SQL Editor → New query → pegar el contenido del archivo → Run). Es idempotente, se
puede volver a correr sin romper nada. Incluye:

- Las tablas `organizations` y `profiles`.
- Un trigger sobre `auth.users` que crea la organización y el perfil automáticamente
  cuando alguien se registra (usa `full_name`/`company` que manda `signUp()`).
- La función `activate_preview_plan` que usa el panel para cambiar de plan sin cobro.
- Políticas de Row Level Security para que cada usuario solo vea su propio perfil/organización.

Si además cambiás de proyecto de Supabase, actualizá `.env.local` con la nueva
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **antes** de probar
signup/login.

## Datos

- **Supabase (Postgres)**: autenticación y datos de cuenta (`profiles`, `organizations`,
  RPC `activate_preview_plan`) — esquema en `supabase/schema.sql`.
- **SQLite local** (`data/app.db`, vía `better-sqlite3` + Drizzle): `leads`,
  `participants`, `subscribers` — capturas del embudo de marketing. El archivo se
  crea solo en el primer arranque; **debe persistir en el servidor** (no se sube a git)
  y debe incluirse en los backups del VPS.

## Despliegue en un VPS con CloudPanel

1. **Crea un sitio Node.js en CloudPanel**: elige la versión de Node (`>=22.13`), y
   define el puerto de la app (CloudPanel reverse-proxea tu dominio con Nginx + SSL
   hacia ese puerto).
2. **Sube el código** al directorio del sitio (git clone o deploy).
3. **Variables de entorno**: crea `.env.local` en la raíz del proyecto (o cárgalas
   desde el editor de variables de entorno de CloudPanel) con:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `PORT` — el mismo puerto configurado en CloudPanel (si no lo define CloudPanel
     automáticamente)
   - `SQLITE_DB_PATH` (opcional) — ruta absoluta al archivo SQLite si no quieres usar
     el default `./data/app.db`
4. **Instala dependencias**: `pnpm install --no-frozen-lockfile` si tu lockfile
   cambió, o `pnpm install` normalmente. `better-sqlite3` compila un addon nativo en
   el `install`; si el VPS no tiene un binario prebuilt para tu plataforma, necesitas
   build tools (`python3`, `make`, `g++`) instalados. Este repo ya trae
   `pnpm-workspace.yaml` con `allowBuilds` aprobado para los paquetes nativos que
   necesita (`better-sqlite3`, `esbuild`, `sharp`, `unrs-resolver`), así que
   `pnpm install` no debería pedir aprobación interactiva.
5. **Build**: `pnpm run build`.
6. **Startup command**: configura CloudPanel para ejecutar `pnpm run start` (o
   `node_modules/.bin/vinext start`) como comando de arranque del sitio Node.js.
7. Verifica que el directorio `data/` (el archivo SQLite) sea persistente entre
   despliegues y esté incluido en tus backups.

## Aprender más

- [Documentación de vinext](https://github.com/cloudflare/vinext)
- [Guía de Drizzle + better-sqlite3](https://orm.drizzle.team/docs/get-started/sqlite-new)
