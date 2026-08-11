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
