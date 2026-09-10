"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); setMessage(""); try { const email = String(new FormData(event.currentTarget).get("email") || ""); const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const data = await response.json(); setMessage(response.ok ? "If this email has an account, a password-reset link has been sent." : data.error || "Unable to send reset link."); } catch { setMessage("Unable to reach the reset service. Please try again."); } finally { setLoading(false); } };
  return <section className="container-page py-14"><form onSubmit={submit} className="card mx-auto max-w-md"><p className="eyebrow">Account recovery</p><h1 className="mt-2 text-3xl font-bold">Forgot your password?</h1><p className="mt-3 text-sm text-stone-500">Enter your email and we’ll send a secure reset link.</p><label className="mt-6 block text-sm font-medium">Email address<input required name="email" type="email" autoComplete="email" className="input mt-2" /></label>{message && <p className="mt-4 text-sm text-stone-600">{message}</p>}<button disabled={loading} className="btn-primary mt-6 w-full">{loading ? "Sending…" : "Send reset link"}</button><Link className="mt-5 block text-center text-sm font-semibold text-brand-700" href="/login">Back to login</Link></form></section>;
}
