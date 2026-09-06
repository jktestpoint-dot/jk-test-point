import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAuthenticatedStudent,
  refreshStudentSession,
} from "@/lib/supabase-auth";
import { getSupabaseConfig } from "@/lib/supabase";
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

function getPaymentConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.RAZORPAY_MODE !== "test" || !keyId?.startsWith("rzp_test_") || !keySecret || !serviceRoleKey) return null;
  return { keySecret, serviceRoleKey };
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

  const config = getPaymentConfig();
  if (!config) return NextResponse.json({ error: "Razorpay test-mode payments are not configured." }, { status: 503 });
  if (!verifyRazorpaySignature(orderId, paymentId, signature, config.keySecret)) {
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }

  try {
    const { url } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/complete_subject_payment_order`, {
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
