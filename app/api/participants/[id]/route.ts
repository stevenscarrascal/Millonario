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
