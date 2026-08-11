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

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${slugify(participant.name)}.pdf"`,
    },
  });
}
