import { env } from "cloudflare:workers";

const schema = `CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
)`;

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; email?: string; phone?: string };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  if (!name || !email || !phone || !email.includes("@")) {
    return Response.json({ error: "Datos de registro incompletos" }, { status: 400 });
  }
  await env.DB.prepare(schema).run();
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO participants (id, name, email, phone, consent, created_at) VALUES (?, ?, ?, ?, 1, ?)")
    .bind(id, name.slice(0, 120), email.slice(0, 180), phone.slice(0, 40), Date.now()).run();
  return Response.json({ id }, { status: 201 });
}
