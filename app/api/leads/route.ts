import { getDb } from "../../../db";
import { leads } from "../../../db/schema";

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; company?: string; email?: string; phone?: string };
  const name = body.name?.trim();
  const company = body.company?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  if (!name || !company || !email || !phone || !email.includes("@")) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  const id = crypto.randomUUID();
  await getDb().insert(leads).values({
    id, name: name.slice(0, 120), company: company.slice(0, 160), email: email.slice(0, 180), phone: phone.slice(0, 40), createdAt: new Date(),
  });
  return Response.json({ id }, { status: 201 });
}
