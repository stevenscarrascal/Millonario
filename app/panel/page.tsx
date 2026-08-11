import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../../db";
import { participants } from "../../db/schema";
import { createClient } from "../../lib/supabase/server";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

type Organization = { id: string; name: string; plan: string; status: string; participant_limit: number; expires_at: string | null };
type Profile = { full_name: string | null; role: string; organizations: Organization | Organization[] | null };

const planNames: Record<string,string> = { free:"Free", monthly:"Mensual", quarterly:"Trimestral", semiannual:"Semestral", annual:"Anual", premium:"Premium" };

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("full_name, role, organizations(id, name, plan, status, participant_limit, expires_at)").eq("id", user.id).single();
  const profile = data as Profile | null;
  const organizationRaw = profile?.organizations;
  const organization = (Array.isArray(organizationRaw) ? organizationRaw[0] : organizationRaw) || { id:"", name:"Mi organización", plan:"free", status:"active", participant_limit:10, expires_at:null };
  const isActive = organization.status === "active" && (!organization.expires_at || new Date(organization.expires_at) > new Date());

  const organizationParticipants = organization.id ? await getParticipants(organization.id) : [];

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const inviteUrl = organization.id ? `${protocol}://${host}/juego?org=${organization.id}` : "";

  return <DashboardClient
    fullName={profile?.full_name || "Administrador"}
    email={user.email || ""}
    role={profile?.role || "owner"}
    organizationName={organization.name}
    plan={planNames[organization.plan] || organization.plan}
    planCode={organization.plan}
    status={organization.status}
    participantLimit={organization.participant_limit}
    expiresAt={organization.expires_at}
    isActive={isActive}
    organizationId={organization.id}
    inviteUrl={inviteUrl}
    participants={organizationParticipants}
  />;
}

type PanelParticipant = { id: string; name: string; email: string; phone: string; createdAt: string; finishedAt: string | null; winningsPoints: number | null; level: string | null; masteryPercent: number | null };

async function getParticipants(organizationId: string): Promise<PanelParticipant[]> {
  try {
    const rows = await getDb().select().from(participants).where(eq(participants.organizationId, organizationId)).orderBy(desc(participants.createdAt));
    return rows.map((participant) => ({
      id: participant.id,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      createdAt: participant.createdAt.toISOString(),
      finishedAt: participant.finishedAt ? participant.finishedAt.toISOString() : null,
      winningsPoints: participant.winningsPoints,
      level: participant.level,
      masteryPercent: participant.masteryPercent,
    }));
  } catch {
    return [];
  }
}
