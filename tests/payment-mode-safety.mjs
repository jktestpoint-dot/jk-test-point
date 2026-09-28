import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasAnyVerifiedLiveOrder, isAvailablePaidMock, isPaymentDatabaseSafe, isVerifiedLivePurchase, paymentModeMatchesOrder } from "../lib/payment-mode.ts";
import { verifyRazorpaySignature } from "../lib/razorpay-signature.ts";

test("TEST payment writes fail closed for shared or unconfigured production databases", () => {
  assert.equal(isPaymentDatabaseSafe("test", "https://prod.supabase.co", undefined), false);
  assert.equal(isPaymentDatabaseSafe("test", "https://prod.supabase.co", "https://prod.supabase.co"), false);
  assert.equal(isPaymentDatabaseSafe("test", "http://prod.supabase.co/rest/v1", "https://prod.supabase.co"), false);
  assert.equal(isPaymentDatabaseSafe("test", "https://staging.supabase.co", "https://prod.supabase.co"), true);
  assert.equal(isPaymentDatabaseSafe("live", "https://prod.supabase.co", undefined), true);
});

test("only paid LIVE orders qualify as verified purchases; legacy and TEST orders stay ambiguous/non-live", () => {
  const base = { product_type: "mock_test", product_id: "jkpsi-paid-01", amount_paise: 4900, currency: "INR" };
  assert.equal(isVerifiedLivePurchase({ ...base, payment_mode: "test", status: "paid" }), false);
  assert.equal(isVerifiedLivePurchase({ ...base, status: "paid" }), false);
  assert.equal(isVerifiedLivePurchase({ ...base, payment_mode: "live", status: "created" }), false);
  assert.equal(isVerifiedLivePurchase({ ...base, payment_mode: "live", status: "paid" }), true);
  assert.equal(isVerifiedLivePurchase({ ...base, payment_mode: "live", status: "paid", amount_paise: 0 }), false);
});

test("any matching verified LIVE order grants access, even when an earlier order has no entitlement", async () => {
  const base = { product_type: "mock_test", product_id: "jkpsi-paid-01", amount_paise: 4900, currency: "INR", status: "paid", payment_mode: "live" };
  const orders = [
    { ...base, id: "live-order-older" },
    { ...base, id: "live-order-current" },
  ];
  const checked = [];
  const hasAccess = await hasAnyVerifiedLiveOrder(orders, async (order) => {
    checked.push(order.id);
    return order.id === "live-order-current";
  });
  assert.equal(hasAccess, true);
  assert.deepEqual(checked, ["live-order-older", "live-order-current"]);
});

test("TEST, legacy-unclassified and unmatched orders cannot grant access", async () => {
  const base = { product_type: "subject_mcq", product_id: "indian-economy", amount_paise: 3000, currency: "INR", status: "paid" };
  const orders = [
    { ...base, id: "test-order", payment_mode: "test" },
    { ...base, id: "legacy-order", payment_mode: null },
  ];
  let entitlementChecks = 0;
  assert.equal(await hasAnyVerifiedLiveOrder(orders, async () => { entitlementChecks += 1; return true; }), false);
  assert.equal(entitlementChecks, 0);
  assert.equal(await hasAnyVerifiedLiveOrder([{ ...base, id: "live-without-entitlement", payment_mode: "live" }], async () => false), false);
});

test("payment verification rejects mode mismatches and still binds the signature to the order", () => {
  assert.equal(paymentModeMatchesOrder("live", "live"), true);
  assert.equal(paymentModeMatchesOrder("test", "live"), false);
  assert.equal(paymentModeMatchesOrder(null, "live"), false);
  const secret = "unit-test-only";
  const signature = createHmac("sha256", secret).update("order_live|pay_live").digest("hex");
  assert.equal(verifyRazorpaySignature("order_live", "pay_live", signature, secret), true);
  assert.equal(verifyRazorpaySignature("order_test", "pay_live", signature, secret), false);
});

test("paid mocks cannot be purchased until they have valid questions", () => {
  assert.equal(isAvailablePaidMock(49, 0), false);
  assert.equal(isAvailablePaidMock(49, -1), false);
  assert.equal(isAvailablePaidMock(49, 1), true);
  assert.equal(isAvailablePaidMock(0, 1), false);
});

test("server and migration keep legacy orders unclassified and access LIVE-only", async () => {
  const [createOrder, verify, entitlement, migration] = await Promise.all([
    readFile(new URL("../app/api/payments/create-order/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/payments/verify/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/subject-entitlement.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202609290001_separate_test_and_live_payment_access.sql", import.meta.url), "utf8"),
  ]);
  assert.match(createOrder, /payment_mode:\s*input\.paymentMode/);
  assert.match(createOrder, /isAvailablePaidMock\(mock\.price, mock\.question_count\)/);
  assert.match(verify, /paymentModeMatchesOrder\(storedOrder\.payment_mode, config\.mode\)/);
  assert.match(verify, /providerPayment\.status !== "captured"/);
  assert.match(entitlement, /hasAnyVerifiedLiveOrder\(orders/);
  assert.doesNotMatch(entitlement, /product_id:[\s\S]{0,100}limit: "1"/);
  assert.match(migration, /Existing rows remain NULL/);
  assert.match(migration, /o\.payment_mode = 'live' and o\.status = 'paid'/);
  assert.match(migration, /revoke all on function public\.complete_mock_payment_order/);
  assert.match(migration, /v_order\.provider_payment_id is distinct from p_provider_payment_id/);
  assert.match(migration, /payment_mode is distinct from p_payment_mode/);
  assert.match(createOrder, /isAvailablePaidMock\(mock\.price, mock\.question_count\)/);
});
