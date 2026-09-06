import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAuthenticatedStudent,
  refreshStudentSession,
} from "@/lib/supabase-auth";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { getSupabaseConfig } from "@/lib/supabase";

type RefreshedSession = Awaited<ReturnType<typeof refreshStudentSession>>;
type StoredOrder = { provider_order_id: string | null; amount_paise: number; currency: string };

function withRefreshedSession(response: NextResponse, refreshed: RefreshedSession) {
  if (!refreshed) return response;
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, options);
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, options);
  return response;
}

async function getSession() {
  const store = cookies();
  let accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  let user = accessToken ? await getAuthenticatedStudent(accessToken) : null;
  let refreshed: RefreshedSession = null;

  if (!user && refreshToken) {
    refreshed = await refreshStudentSession(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      user = await getAuthenticatedStudent(accessToken);
    }
  }

  return { user, refreshed };
}

function getPaymentConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (process.env.RAZORPAY_MODE !== "test" || !keyId?.startsWith("rzp_test_") || !keySecret || !serviceRoleKey) {
    return null;
  }

  return { keyId, keySecret, serviceRoleKey };
}

async function findReusableOrder(userId: string, subjectId: string, amountPaise: number, serviceRoleKey: string) {
  const { url } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: "provider_order_id,amount_paise,currency",
    user_id: `eq.${userId}`,
    provider: "eq.razorpay",
    product_type: "eq.subject_mcq",
    product_id: `eq.${subjectId}`,
    status: "eq.created",
    amount_paise: `eq.${amountPaise}`,
    order: "created_at.desc",
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/payment_orders?${params.toString()}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Accept-Profile": "public" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to check existing payment orders.");
  const rows = await response.json() as StoredOrder[];
  return rows[0]?.provider_order_id ? rows[0] : null;
}

async function createStoredOrder(input: { userId: string; subjectId: string; amountPaise: number; providerOrderId: string; serviceRoleKey: string }) {
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/payment_orders`, {
    method: "POST",
    headers: {
      apikey: input.serviceRoleKey,
      Authorization: `Bearer ${input.serviceRoleKey}`,
      "Content-Type": "application/json",
      "Content-Profile": "public",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: input.userId,
      provider: "razorpay",
      provider_order_id: input.providerOrderId,
      product_type: "subject_mcq",
      product_id: input.subjectId,
      amount_paise: input.amountPaise,
      currency: "INR",
      status: "created",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to store the payment order.");
}

export async function POST(request: NextRequest) {
  const { user, refreshed } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in before starting a payment." }, { status: 401 });

  let subjectId: string;
  try {
    const body = await request.json() as { subject?: unknown };
    subjectId = typeof body.subject === "string" ? body.subject.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  const subject = getMcqPracticeSubject(subjectId);
  if (!subject) return NextResponse.json({ error: "This subject is not available for purchase." }, { status: 404 });

  const config = getPaymentConfig();
  if (!config) return NextResponse.json({ error: "Razorpay test-mode payments are not configured." }, { status: 503 });

  const amountPaise = subject.price * 100;
  try {
    const existing = await findReusableOrder(user.id, subject.id, amountPaise, config.serviceRoleKey);
    if (existing) {
      return withRefreshedSession(NextResponse.json({ orderId: existing.provider_order_id, amount: existing.amount_paise, currency: existing.currency, keyId: config.keyId }), refreshed);
    }

    const receipt = `subject_${subject.id}_${user.id.slice(0, 8)}_${Date.now().toString(36)}`.slice(0, 40);
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes: { product_type: "subject_mcq", product_id: subject.id } }),
      cache: "no-store",
    });
    const razorpayOrder = await razorpayResponse.json().catch(() => null) as { id?: string; amount?: number; currency?: string } | null;
    if (!razorpayResponse.ok || !razorpayOrder?.id || razorpayOrder.amount !== amountPaise || razorpayOrder.currency !== "INR") {
      return NextResponse.json({ error: "Razorpay could not create the test order." }, { status: 502 });
    }

    await createStoredOrder({ userId: user.id, subjectId: subject.id, amountPaise, providerOrderId: razorpayOrder.id, serviceRoleKey: config.serviceRoleKey });
    return withRefreshedSession(NextResponse.json({ orderId: razorpayOrder.id, amount: amountPaise, currency: "INR", keyId: config.keyId }, { status: 201 }), refreshed);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the payment order." }, { status: 502 });
  }
}
