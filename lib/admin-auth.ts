import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { getSupabaseConfig } from "@/lib/supabase";

export async function requireAdmin() {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || !(await getAuthenticatedStudent(token))) return null;
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/is_jk_test_admin`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
  return response.ok && await response.json() === true ? token : null;
}
