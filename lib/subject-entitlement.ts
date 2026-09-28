import { getSupabaseConfig } from "@/lib/supabase";
import { hasAnyVerifiedLiveOrder, isVerifiedLivePurchase } from "@/lib/payment-mode";

export type ActiveSubjectEntitlement = {
  id: string;
  subject: string;
  payment_order_id: string;
  payment_mode: "live";
  granted_at: string;
  expires_at: string | null;
};

type LivePaidOrder = {
  id: string;
  product_type: "subject_mcq" | "mock_test";
  product_id: string;
  payment_mode: "live";
  status: "paid";
  currency: "INR";
  amount_paise: number;
};

function authHeaders(accessToken: string) {
  const { key } = getSupabaseConfig();
  return { apikey: key, Authorization: `Bearer ${accessToken}`, "Accept-Profile": "public" };
}

async function getLivePaidOrders(accessToken: string, filters: Record<string, string>) {
  const { url } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: "id,product_type,product_id,payment_mode,status,currency,amount_paise",
    provider: "eq.razorpay",
    payment_mode: "eq.live",
    status: "eq.paid",
    currency: "eq.INR",
    ...filters,
  });
  const response = await fetch(`${url}/rest/v1/payment_orders?${params.toString()}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to verify live payment access.");
  return (await response.json() as LivePaidOrder[]).filter(isVerifiedLivePurchase);
}

async function hasLiveEntitlement(accessToken: string, order: LivePaidOrder, subject: string) {
  if (!isVerifiedLivePurchase(order)) return false;
  const { url } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: "id",
    payment_order_id: `eq.${order.id}`,
    payment_mode: "eq.live",
    subject: `eq.${subject}`,
    status: "eq.active",
    or: `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`,
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/subject_entitlements?${params.toString()}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to verify live payment access.");
  return (await response.json() as Array<{ id: string }>).length > 0;
}

export async function hasActiveSubjectEntitlement(accessToken: string, subject: string) {
  const orders = await getLivePaidOrders(accessToken, {
    product_type: "eq.subject_mcq",
    product_id: `eq.${subject}`,
  });
  return hasAnyVerifiedLiveOrder(orders, (order) => hasLiveEntitlement(accessToken, order, subject));
}

export async function getMyActiveSubjectEntitlements(accessToken: string, userId: string) {
  const orders = await getLivePaidOrders(accessToken, { user_id: `eq.${userId}` });
  const verifiedOrders = orders;
  if (!verifiedOrders.length) return [];

  const orderById = new Map(verifiedOrders.map((order) => [order.id, order]));
  const { url } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: "id,subject,payment_order_id,payment_mode,granted_at,expires_at",
    user_id: `eq.${userId}`,
    payment_order_id: `in.(${verifiedOrders.map((order) => order.id).join(",")})`,
    payment_mode: "eq.live",
    status: "eq.active",
    or: `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`,
    order: "granted_at.desc",
  });
  const response = await fetch(`${url}/rest/v1/subject_entitlements?${params.toString()}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load verified live purchases.");
  const entitlements = await response.json() as ActiveSubjectEntitlement[];
  return entitlements.filter((entitlement) => {
    const order = orderById.get(entitlement.payment_order_id);
    if (!order || entitlement.payment_mode !== "live") return false;
    return order.product_type === "subject_mcq"
      ? entitlement.subject === order.product_id
      : entitlement.subject === `mock:${order.product_id}`;
  });
}

export async function hasActiveMockEntitlement(accessToken: string, testId: string) {
  const orders = await getLivePaidOrders(accessToken, {
    product_type: "eq.mock_test",
    product_id: `eq.${testId}`,
  });
  return hasAnyVerifiedLiveOrder(orders, (order) => hasLiveEntitlement(accessToken, order, `mock:${testId}`));
}
