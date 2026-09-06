import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay-signature";

type RazorpayCapturedPayment = {
  id?: unknown;
  order_id?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  captured?: unknown;
};

type RazorpayWebhookPayload = {
  event?: unknown;
  payload?: { payment?: { entity?: RazorpayCapturedPayment } };
};

function getWebhookConfig() {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.RAZORPAY_MODE !== "test" || !webhookSecret || !serviceRoleKey) return null;
  return { webhookSecret, serviceRoleKey };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 255;
}

export async function POST(request: NextRequest) {
  const config = getWebhookConfig();
  if (!config) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");
  if (!signature || !isNonEmptyString(eventId)) return NextResponse.json({ error: "Invalid webhook headers." }, { status: 400 });

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!verifyRazorpayWebhookSignature(rawBody, signature, config.webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (payload.event !== "payment.captured") return new NextResponse(null, { status: 204 });

  const payment = payload.payload?.payment?.entity;
  if (
    !payment
    || !isNonEmptyString(payment.id)
    || !isNonEmptyString(payment.order_id)
    || typeof payment.amount !== "number"
    || !Number.isInteger(payment.amount)
    || payment.amount <= 0
    || payment.currency !== "INR"
    || payment.status !== "captured"
    || payment.captured !== true
  ) {
    return NextResponse.json({ error: "Invalid captured-payment payload." }, { status: 400 });
  }

  try {
    const { url } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/process_razorpay_payment_captured_webhook`, {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        "Content-Profile": "public",
      },
      body: JSON.stringify({
        p_provider_event_id: eventId,
        p_provider_order_id: payment.order_id,
        p_provider_payment_id: payment.id,
        p_amount_paise: payment.amount,
        p_currency: payment.currency,
      }),
      cache: "no-store",
    });

    if (!response.ok) return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
    const result = await response.json().catch(() => null) as { already_processed?: boolean } | null;
    return NextResponse.json({ received: true, alreadyProcessed: result?.already_processed === true });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
