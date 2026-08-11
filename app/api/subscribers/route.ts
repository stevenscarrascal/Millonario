import { getDb } from "../../../db";
import { subscribers } from "../../../db/schema";

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; email?: string; company?: string; score?: number };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const company = body.company?.trim() || null;
  const score = Math.max(0, Math.min(3, Number(body.score) || 0));
  if (!name || !email || !email.includes("@")) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  const id = crypto.randomUUID();
  await getDb().insert(subscribers).values({
    id, name: name.slice(0, 120), email: email.slice(0, 180), company: company?.slice(0, 160) || null, demoScore: score, createdAt: new Date(),
  });
  return Response.json({ id }, { status: 201 });
}
