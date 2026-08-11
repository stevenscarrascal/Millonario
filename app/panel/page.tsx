import { redirect } from "next/navigation";
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
  />;
}
