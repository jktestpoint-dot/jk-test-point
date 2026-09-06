"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateOrderResponse = { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string };
type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", callback: () => void) => void };

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      handler: (response: RazorpaySuccess) => void;
      modal: { ondismiss: () => void };
    }) => RazorpayInstance;
  }
}

let razorpayScript: Promise<boolean> | undefined;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScript) return razorpayScript;
  razorpayScript = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return razorpayScript;
}

export function SubjectCheckoutButton({ subject, subjectName, hasEntitlement }: { subject: string; subjectName: string; hasEntitlement: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "starting" | "verifying">("idle");
  const [message, setMessage] = useState("");

  const startCheckout = async () => {
    if (hasEntitlement) {
      router.push(`/mcq-practice/${encodeURIComponent(subject)}/attempt`);
      return;
    }

    setState("starting");
    setMessage("");
    try {
      const [scriptLoaded, orderResponse] = await Promise.all([
        loadRazorpayCheckout(),
        fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject }),
        }),
      ]);
      const order = await orderResponse.json().catch(() => ({})) as CreateOrderResponse;
      const amount = order.amount;
      if (!orderResponse.ok || !order.orderId || typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || order.currency !== "INR" || !order.keyId?.startsWith("rzp_test_") || !scriptLoaded || !window.Razorpay) {
        throw new Error(order.error || "Unable to start secure test checkout.");
      }
      const { orderId, currency, keyId } = order as Required<Pick<CreateOrderResponse, "orderId" | "currency" | "keyId">>;

      const checkout = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "JK Test Point",
        description: `${subjectName} MCQ Practice`,
        order_id: orderId,
        handler: async (payment) => {
          setState("verifying");
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payment),
            });
            const verified = await verifyResponse.json().catch(() => ({})) as { status?: string; error?: string };
            if (!verifyResponse.ok || verified.status !== "paid") throw new Error(verified.error || "Payment verification failed. Your access has not been changed.");
            router.push(`/mcq-practice/${encodeURIComponent(subject)}/attempt`);
            router.refresh();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification failed. Your access has not been changed.");
            setState("idle");
          }
        },
        modal: { ondismiss: () => { setMessage("Checkout was cancelled. No payment was verified."); setState("idle"); } },
      });
      checkout.on("payment.failed", () => { setMessage("Payment was not completed. No access was granted."); setState("idle"); });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start secure test checkout.");
      setState("idle");
    }
  };

  return <div className="mt-6"><button type="button" className="btn-primary" disabled={state !== "idle"} onClick={startCheckout}>{state === "starting" ? "Opening checkout..." : state === "verifying" ? "Verifying payment..." : "Start Practice"}</button>{message && <p className="mt-3 text-sm text-rose-600" role="status">{message}</p>}</div>;
}
