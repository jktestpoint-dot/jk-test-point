export type PaymentMode = "test" | "live";

type PaymentOrderLike = {
  payment_mode?: unknown;
  status?: unknown;
  product_type?: unknown;
  product_id?: unknown;
  amount_paise?: unknown;
  currency?: unknown;
};

export function isPaymentMode(value: unknown): value is PaymentMode {
  return value === "test" || value === "live";
}

export function isVerifiedLivePurchase(order: PaymentOrderLike) {
  return order.payment_mode === "live" && order.status === "paid" && order.currency === "INR"
    && (order.product_type === "subject_mcq" || order.product_type === "mock_test")
    && typeof order.product_id === "string" && order.product_id.trim().length > 0
    && typeof order.amount_paise === "number" && Number.isInteger(order.amount_paise) && order.amount_paise > 0;
}

export function paymentModeMatchesOrder(orderMode: unknown, runtimeMode: unknown) {
  return isPaymentMode(orderMode) && isPaymentMode(runtimeMode) && orderMode === runtimeMode;
}

export async function hasAnyVerifiedLiveOrder<T extends PaymentOrderLike>(
  orders: T[],
  hasEntitlement: (order: T) => Promise<boolean>,
) {
  for (const order of orders) {
    if (isVerifiedLivePurchase(order) && await hasEntitlement(order)) return true;
  }
  return false;
}

export function isAvailablePaidMock(price: unknown, questionCount: unknown) {
  return typeof price === "number" && Number.isFinite(price) && price > 0
    && typeof questionCount === "number" && Number.isInteger(questionCount) && questionCount > 0;
}

function normalizedHost(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Test payment writes require an explicitly configured, non-production DB. */
export function isPaymentDatabaseSafe(mode: PaymentMode, databaseUrl?: string, productionDatabaseUrl?: string) {
  if (mode === "live") return true;
  const databaseHost = normalizedHost(databaseUrl);
  const productionHost = normalizedHost(productionDatabaseUrl);
  return Boolean(databaseHost && productionHost && databaseHost !== productionHost);
}
