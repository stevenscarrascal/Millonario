import { env } from "cloudflare:workers";

const schema = `CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`;

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; company?: string; email?: string; phone?: string };
  const name = body.name?.trim();
  const company = body.company?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  if (!name || !company || !email || !phone || !email.includes("@")) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  await env.DB.prepare(schema).run();
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO leads (id, name, company, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, name.slice(0,120), company.slice(0,160), email.slice(0,180), phone.slice(0,40), Date.now()).run();
  return Response.json({ id }, { status: 201 });
}
