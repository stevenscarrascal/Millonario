import { env } from "cloudflare:workers";

const schema = `CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  demo_score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
)`;

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; email?: string; company?: string; score?: number };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const company = body.company?.trim() || null;
  const score = Math.max(0, Math.min(3, Number(body.score) || 0));
  if (!name || !email || !email.includes("@")) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  await env.DB.prepare(schema).run();
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO subscribers (id, name, email, company, demo_score, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, name.slice(0,120), email.slice(0,180), company?.slice(0,160) || null, score, Date.now()).run();
  return Response.json({ id }, { status: 201 });
}
