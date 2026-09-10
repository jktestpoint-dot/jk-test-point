"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = { name: String(form.get("name") || ""), email: String(form.get("email") || ""), password: String(form.get("password") || "") };
    try {
      if (!register) { const session = await supabase.auth.signInWithPassword({ email: payload.email, password: payload.password }); const saved = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(session) }); const savedBody = await saved.json().catch(() => null) as { error?: string } | null; if (!saved.ok) throw new Error(savedBody?.error || "Unable to establish your session."); const role = await fetch("/api/auth/role", { cache: "no-store" }); const roleBody = await role.json().catch(() => ({ admin: false })) as { admin?: boolean }; window.dispatchEvent(new Event("jk-auth-change")); router.push(roleBody.admin ? "/admin" : "/dashboard"); router.refresh(); return; }
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to continue.");
      if (result.requiresEmailVerification) { setVerificationEmail(payload.email.trim().toLowerCase()); return; }
      window.dispatchEvent(new Event("jk-auth-change")); router.push("/dashboard"); router.refresh();
    } catch (caught) { setError(caught instanceof TypeError ? "Cannot reach the local login server. Open http://localhost:3000/login and restart the development server." : caught instanceof Error ? caught.message : "Unable to continue."); } finally { setLoading(false); }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const token = String(new FormData(event.currentTarget).get("token") || "");
    try {
      const response = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: verificationEmail, token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to verify your email.");
      window.dispatchEvent(new Event("jk-auth-change")); router.push("/dashboard"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to verify your email."); } finally { setLoading(false); }
  };

  if (verificationEmail) return <section className="container-page py-14"><form onSubmit={verifyCode} className="card mx-auto max-w-md"><p className="eyebrow">Verify your email</p><h1 className="mt-2 text-3xl font-bold">Enter your OTP</h1><p className="mt-3 text-sm leading-6 text-stone-500">We sent a 6-digit verification code to <b>{verificationEmail}</b>. Your account will become active only after verification.</p><label className="mt-6 block text-sm font-medium">Verification code<input required name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="input mt-2 tracking-[0.45em]" placeholder="123456" autoComplete="one-time-code" /></label>{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}<button disabled={loading} className="btn-primary mt-6 w-full">{loading ? "Verifying..." : "Verify email"}</button><button type="button" className="mt-4 w-full text-sm font-semibold text-brand-700" onClick={() => { setVerificationEmail(""); setError(""); }}>Use a different email</button></form></section>;

  return <section className="container-page py-14"><form onSubmit={submit} className="card mx-auto max-w-md"><p className="eyebrow">{register ? "Create account" : "Welcome back"}</p><h1 className="mt-2 text-3xl font-bold">{register ? "Start preparing today" : "Login to your account"}</h1>{register && <label className="mt-6 block text-sm font-medium">Full name<input required name="name" className="input mt-2" placeholder="Your name" autoComplete="name" /></label>}<label className="mt-4 block text-sm font-medium">Email address<input required name="email" type="email" className="input mt-2" placeholder="you@example.com" autoComplete="email" /></label><label className="mt-4 block text-sm font-medium">Password<input required name="password" minLength={8} type="password" className="input mt-2" placeholder="At least 8 characters" autoComplete={register ? "new-password" : "current-password"} /></label>{!register && <Link href="/forgot-password" className="mt-3 block text-right text-sm font-semibold text-brand-700">Forgot Password?</Link>}{register && <p className="mt-3 text-xs leading-5 text-stone-500">We will verify this email with a one-time code before activating your account.</p>}{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}<button disabled={loading} className="btn-primary mt-6 w-full">{loading ? "Please wait..." : register ? "Create account" : "Login"}</button><p className="mt-5 text-center text-sm text-stone-500">{register ? "Already have an account?" : "New to JK Test Point?"} <Link className="font-semibold text-brand-600" href={register ? "/login" : "/register"}>{register ? "Login" : "Create an account"}</Link></p></form></section>;
}
