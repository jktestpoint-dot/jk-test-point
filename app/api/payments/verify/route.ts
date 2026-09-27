import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAuthenticatedStudent,
  refreshStudentSession,
} from "@/lib/supabase-auth";
import { getSupabaseConfig } from "@/lib/supabase";
import { getRazorpayPaymentConfig } from "@/lib/razorpay-config";
import { verifyRazorpaySignature } from "@/lib/razorpay-signature";

type RefreshedSession = Awaited<ReturnType<typeof refreshStudentSession>>;

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

function isValidRazorpayIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 255;
}

export async function POST(request: NextRequest) {
  const { user, refreshed } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in before verifying a payment." }, { status: 401 });

  let orderId: unknown;
  let paymentId: unknown;
  let signature: unknown;
  try {
    const body = await request.json() as { razorpay_order_id?: unknown; razorpay_payment_id?: unknown; razorpay_signature?: unknown };
    orderId = body.razorpay_order_id;
    paymentId = body.razorpay_payment_id;
    signature = body.razorpay_signature;
  } catch {
    return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
  }

  if (!isValidRazorpayIdentifier(orderId) || !isValidRazorpayIdentifier(paymentId) || !isValidRazorpayIdentifier(signature)) {
    return NextResponse.json({ error: "Invalid Razorpay payment identifiers." }, { status: 400 });
  }

  const config = getRazorpayPaymentConfig();
  if (!config) return NextResponse.json({ error: "Razorpay payments are not configured for this environment." }, { status: 503 });

  try {
    const { url } = getSupabaseConfig();
    const orderLookup = await fetch(`${url}/rest/v1/payment_orders?select=provider_order_id,product_type,amount_paise,currency&provider=eq.razorpay&provider_order_id=eq.${encodeURIComponent(orderId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, "Accept-Profile": "public" }, cache: "no-store" });
    const orderRows = await orderLookup.json().catch(() => []) as Array<{ provider_order_id?: string; product_type?: string; amount_paise?: number; currency?: string }>;
    const storedOrder = orderRows[0];
    if (!orderLookup.ok || !storedOrder?.provider_order_id || !storedOrder.product_type) return NextResponse.json({ error: "Unknown payment order." }, { status: 400 });
    if (!verifyRazorpaySignature(storedOrder.provider_order_id, paymentId, signature, config.keySecret)) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const providerResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}` },
      cache: "no-store",
    });
    const providerPayment = await providerResponse.json().catch(() => null) as { id?: unknown; order_id?: unknown; amount?: unknown; currency?: unknown; status?: unknown; captured?: unknown } | null;
    if (!providerResponse.ok || !providerPayment) return NextResponse.json({ error: "Unable to verify the payment with Razorpay." }, { status: 502 });
    if (
      providerPayment.id !== paymentId
      || providerPayment.order_id !== storedOrder.provider_order_id
      || providerPayment.amount !== storedOrder.amount_paise
      || providerPayment.currency !== storedOrder.currency
      || providerPayment.currency !== "INR"
      || providerPayment.status !== "captured"
      || providerPayment.captured !== true
    ) {
      return NextResponse.json({ error: "Payment has not been captured or does not match this order. Access was not granted." }, { status: 409 });
    }

    const completionRpc = storedOrder.product_type === "mock_test" ? "complete_mock_payment_order" : "complete_subject_payment_order";
    const response = await fetch(`${url}/rest/v1/rpc/${completionRpc}`, {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        "Content-Profile": "public",
      },
      body: JSON.stringify({ p_user_id: user.id, p_provider_order_id: orderId, p_provider_payment_id: paymentId }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null) as { message?: string; subject?: string; amount_paise?: number; status?: string; already_processed?: boolean } | null;
    if (!response.ok || !data) return NextResponse.json({ error: data?.message || "Unable to complete the payment." }, { status: response.status === 403 ? 403 : 400 });
    return withRefreshedSession(NextResponse.json({ subject: data.subject, amount: data.amount_paise, status: data.status, alreadyProcessed: data.already_processed === true }), refreshed);
  } catch {
    return NextResponse.json({ error: "Unable to complete the payment." }, { status: 502 });
  }
}
