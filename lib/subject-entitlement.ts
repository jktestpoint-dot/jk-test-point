import { getSupabaseConfig } from "@/lib/supabase";

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
