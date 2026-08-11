# Reportes y certificados en el panel — Diseño

## Contexto

Hoy el flujo de `/juego` registra al participante (nombre/correo/teléfono) **antes** de jugar
vía `POST /api/participants`, pero nunca guarda el resultado de la partida: la respuesta del
`fetch` en `register()` se descarta (ni siquiera se captura el `id`), y `finish()` solo cambia
estado visual local (`winnings`, `endTitle`, `screen`). Las pestañas "Reportes" y "Certificados"
del panel (`app/panel/dashboard-client.tsx`) son mockups estáticos: el reporte muestra un
"fake-chart" decorativo con el texto "Tu primer reporte aparecerá aquí", y certificados muestra
un contador fijo en `0`. Tres métricas del resumen (`EXPERIENCIAS REALIZADAS`,
`PROMEDIO DE CONOCIMIENTO`, `CERTIFICADOS EMITIDOS`) también están hardcodeadas.

Este documento cubre: (1) capturar el resultado real de cada partida, (2) mostrarlo en el panel
(reportes + métricas del resumen), (3) certificado en PDF descargable tanto por el participante
que gana como desde el panel de la organización.

## 1. Modelo de datos

Se extiende la tabla `participants` (`db/schema.ts`, SQLite local) con columnas opcionales —
sin migración de datos, las filas existentes quedan con `null`:

```ts
finishedAt: integer("finished_at", { mode: "timestamp" }),      // null = nunca terminó
winningsPoints: integer("winnings_points"),
level: text("level"),          // "INTERMEDIO" | "AVANZADO" | "ESPECIALISTA" | "EXPERTO" | "EXPERTO INTERNACIONAL"
masteryPercent: integer("mastery_percent"),                     // 0-100
```

`db/index.ts` ya tiene un helper `ensureColumn()` que usa `PRAGMA table_info` + `ALTER TABLE ...
ADD COLUMN` para bases de datos SQLite preexistentes en el VPS — las 4 columnas nuevas se agregan
ahí, junto a las ya existentes (`organization_id`, etc.).

**Certificado elegible** = `level` distinto de `"INTERMEDIO"` **y** `finishedAt` no nulo. Esta
regla vive en una única función pura reutilizada por: el botón de descarga en `/juego`, la
pestaña "Certificados" del panel, y el endpoint de generación del PDF (que revalida
server-side, no confía en el cliente).

## 2. Captura del resultado

- `game-client.tsx`: `register()` hoy hace `await fetch(...)` y descarta la respuesta. Se
  cambia para leer `{ id }` del JSON de respuesta y guardarlo en un nuevo estado
  `participantId: string | null`. Si el POST falla (red caída), `participantId` queda `null` y
  el resto del flujo sigue funcionando igual que hoy (modo best-effort ya existente).
- Nuevo endpoint `app/api/participants/[id]/route.ts` con handler `PATCH`, recibe
  `{ winningsPoints: number; level: string; masteryPercent: number }`, valida los tipos, y
  actualiza la fila con `finishedAt = new Date()`.
- `finish(title, amount)` en `game-client.tsx`: además de lo que ya hace (poner `endTitle`,
  `winnings`, `screen`), si `participantId` no es `null` dispara (best-effort, sin bloquear la
  UI) el `PATCH` con:
  - `winningsPoints`: `Number(amount.replace(/\./g, ""))` (convierte el string formateado
    `"1.000.000"` al entero `1000000`).
  - `level`: el valor de `level` (ya calculado vía `useMemo` a partir de `current`) en el
    momento de finalizar.
  - `masteryPercent`: `Math.min(100, Math.round(mastery / 2.2))` — la misma fórmula que ya se
    usa para pintar la barra de dominio en pantalla.

## 3. Panel → pestaña "Reportes"

`app/panel/page.tsx` ya construye `organizationParticipants` vía `getParticipants()` — se
extiende el `select()` de Drizzle y el tipo `PanelParticipant` para incluir los 4 campos nuevos,
y se pasan a `DashboardClient` igual que hoy (sin endpoint nuevo).

`ParticipantsPanel`-equivalente para reportes: nueva tabla con columnas Nombre, Correo, Nivel,
Puntos, % Dominio, Fecha, Certificado (`✓` si elegible, `—` si no). Filas sin `finishedAt`
(abandonaron antes de terminar) muestran `—` en las columnas de resultado en vez de `0`, para
distinguir "no terminó" de "terminó con 0 puntos".

El botón "EXPORTAR REPORTE" (hoy `disabled`) se habilita y genera un CSV client-side: construye
el string CSV a partir de `props.participants` (ya cargado, sin llamada al servidor), crea un
`Blob` con `type: "text/csv;charset=utf-8"`, y dispara la descarga vía un `<a>` temporal con
`URL.createObjectURL`. Nombre de archivo: `reporte-{organizationName-slugified}-{fecha}.csv`.

**Métricas del resumen** (`dashboard-client.tsx`, tab `overview`), calculadas del mismo array
`props.participants` en vez de estar fijas:
- `EXPERIENCIAS REALIZADAS` = cantidad con `finishedAt` no nulo.
- `PROMEDIO DE CONOCIMIENTO` = promedio de `masteryPercent` entre los que finalizaron,
  formateado como `{n}%` (o `—` si nadie ha finalizado aún, para no mostrar `NaN%`/`0%`
  engañoso).
- `CERTIFICADOS EMITIDOS` = cantidad que cumple la regla de elegibilidad de la sección 1.

## 4. Panel → pestaña "Certificados" + descarga desde `/juego`

- Pestaña "Certificados": lista (tabla o tarjetas, reutilizando el estilo de
  `.participants-list`) solo los participantes elegibles, cada fila con un botón/enlace
  "DESCARGAR" apuntando a `/api/certificates/{id}`. El contador "Certificados emitidos" del
  encabezado usa el mismo cálculo de la sección 3.
- Pantalla `screen === "end"` en `game-client.tsx`: si `isCertificateEligible(level, finishedAt)`
  es verdadero (evaluado localmente con los mismos valores que ya están en pantalla), se muestra
  un botón/enlace adicional "DESCARGAR CERTIFICADO" junto al botón "JUGAR DE NUEVO", como
  `<a href={`/api/certificates/${participantId}`} target="_blank">`. Es un enlace normal, no
  `fetch`+blob — el navegador maneja la descarga a partir del `Content-Disposition: attachment`
  que devuelve el endpoint.
- Ambos casos usan el **mismo** endpoint público (sin sesión de Supabase) — mismo modelo de
  seguridad que el link de invitación de `/juego?org=`: el `id` es un UUID v4 no adivinable, no
  hay dato sensible expuesto (nombre, organización, nivel, fecha — nada que no supiera ya quien
  tiene el link de invitación de esa organización).

## 5. Generación del PDF — `app/api/certificates/[id]/route.ts`

- `GET` handler: busca el participante en SQLite por `id`. Si no existe o no es elegible
  (misma función `isCertificateEligible` de la sección 1, revalidada server-side — no basta con
  que el cliente decida mostrar el botón), responde `404`.
- Si es elegible, arma el PDF con `@react-pdf/renderer` (`renderToBuffer`) a partir de un
  componente `CertificateDocument` (nuevo archivo `app/api/certificates/certificate-pdf.tsx`,
  usa `Document`/`Page`/`View`/`Text`/`StyleSheet` de `@react-pdf/renderer` — no JSX de React
  DOM, es su propio set de componentes) con:
  - Nombre del participante (grande, centrado).
  - Nombre de la organización.
  - "Otorgado por completar el Reto Internacional de Cumplimiento" + nivel alcanzado y puntaje
    (ej. "ESPECIALISTA · 32.000 puntos").
  - Fecha de finalización, formateada en español (`Intl.DateTimeFormat("es-CO")`).
  - Código de verificación: el `id` (UUID) del participante, en una esquina, texto pequeño.
  - Paleta de marca (navy `#0b1533` / gold `#f2ae32`), sin imágenes/logo — solo texto y formas
    vectoriales simples (rectángulos/bordes), para no depender de assets binarios extra.
- Devuelve `Response` con `Content-Type: application/pdf` y
  `Content-Disposition: attachment; filename="certificado-{nombre-slugificado}.pdf"`.
- Nueva dependencia: `@react-pdf/renderer` (puro JS, sin binarios/Chromium — corre igual en el
  VPS Node que en local).

## Fuera de alcance

- No hay autenticación en el endpoint de certificados (ver sección 4 — mismo modelo que el link
  de invitación existente).
- No se agrega un endpoint autenticado de exportación de reporte — el CSV se genera client-side
  a partir de datos que el panel ya carga para el usuario autenticado.
- No se rediseña la plantilla del certificado más allá de lo descrito arriba (sin logo, sin
  personalización por organización en esta iteración).
- No se persiste "quién descargó el certificado" ni se limita el número de descargas.
