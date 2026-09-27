import "server-only";

export type RazorpayMode = "test" | "live";

type RazorpayPaymentConfig = {
  mode: RazorpayMode;
  keyId: string;
  keySecret: string;
  serviceRoleKey: string;
};

type RazorpayWebhookConfig = RazorpayPaymentConfig & {
  webhookSecret: string;
};

function isProductionRuntime() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

export function getRazorpayPaymentConfig(): RazorpayPaymentConfig | null {
  const mode = process.env.RAZORPAY_MODE;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (mode !== "test" && mode !== "live") return null;
  if (isProductionRuntime() && mode !== "live") return null;

  const requiredPrefix = mode === "live" ? "rzp_live_" : "rzp_test_";
  if (!keyId?.startsWith(requiredPrefix) || !keySecret || !serviceRoleKey) return null;

  return { mode, keyId, keySecret, serviceRoleKey };
}

export function getRazorpayWebhookConfig(): RazorpayWebhookConfig | null {
  const paymentConfig = getRazorpayPaymentConfig();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!paymentConfig || !webhookSecret) return null;
  return { ...paymentConfig, webhookSecret };
}
