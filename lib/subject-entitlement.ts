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

/**
 * Paid mock access is represented by the existing payment foundation.  The
 * optional mock entitlement convention is also accepted so a future mock
 * completion flow can grant an explicit entitlement without changing this
 * boundary. Both queries are scoped by Supabase RLS to the bearer user.
 */
export async function hasActiveMockEntitlement(accessToken: string, testId: string) {
  const { url, key } = getSupabaseConfig();
  const headers = { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" };
  const entitlementParams = new URLSearchParams({
    select: "id",
    subject: `eq.mock:${testId}`,
    status: "eq.active",
    or: `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`,
    limit: "1",
  });
  const orderParams = new URLSearchParams({
    select: "id",
    provider: "eq.razorpay",
    product_type: "eq.mock_test",
    product_id: `eq.${testId}`,
    status: "eq.paid",
    currency: "eq.INR",
    limit: "1",
  });
  const [entitlementResponse, orderResponse] = await Promise.all([
    fetch(`${url}/rest/v1/subject_entitlements?${entitlementParams.toString()}`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/payment_orders?${orderParams.toString()}`, { headers, cache: "no-store" }),
  ]);
  if (!entitlementResponse.ok || !orderResponse.ok) throw new Error("Unable to verify mock access.");
  const entitlements = await entitlementResponse.json() as Array<{ id: string }>;
  const orders = await orderResponse.json() as Array<{ id: string }>;
  return entitlements.length > 0 || orders.length > 0;
}
