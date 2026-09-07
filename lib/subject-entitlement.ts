import { getSupabaseConfig } from "@/lib/supabase";

export type ActiveSubjectEntitlement = {
  id: string;
  subject: string;
  granted_at: string;
  expires_at: string | null;
};

export async function hasActiveSubjectEntitlement(accessToken: string, subject: string) {
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({ select: "id", subject: `eq.${subject}`, status: "eq.active", limit: "1" });
  const response = await fetch(`${url}/rest/v1/subject_entitlements?${params.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to verify subject access.");
  return (await response.json() as Array<{ id: string }>).length === 1;
}

export async function getMyActiveSubjectEntitlements(accessToken: string, userId: string) {
  const { url, key } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: "id,subject,granted_at,expires_at",
    user_id: `eq.${userId}`,
    status: "eq.active",
    or: `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`,
    order: "granted_at.desc",
  });
  const response = await fetch(`${url}/rest/v1/subject_entitlements?${params.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load purchased subjects.");
  return response.json() as Promise<ActiveSubjectEntitlement[]>;
}
