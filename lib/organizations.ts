import { createClient } from "./supabase/server";

export type PublicOrganization = { name: string; is_active: boolean };

export async function getPublicOrganization(organizationId: string): Promise<PublicOrganization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_organization", { org_id: organizationId });
  if (error || !data) return null;
  return data as PublicOrganization;
}
