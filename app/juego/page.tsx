import { getPublicOrganization } from "../../lib/organizations";
import GameClient from "./game-client";

export const dynamic = "force-dynamic";

export default async function JuegoPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const organization = org ? await getPublicOrganization(org) : null;

  if (!organization || !organization.is_active) {
    return (
      <main className="stage-shell">
        <section className="welcome panel">
          <p className="eyebrow">ENLACE NO VÁLIDO</p>
          <h1>Este enlace no es válido o ya venció.</h1>
          <p className="lead">Contacta a quien te invitó para conseguir un enlace de participación vigente.</p>
        </section>
      </main>
    );
  }

  return <GameClient organizationId={org as string} />;
}
