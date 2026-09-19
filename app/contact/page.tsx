"use client";

import { FormEvent, useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSent(false);
    setSending(true);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: String(form.get("name") || ""), email: String(form.get("email") || ""), message: String(form.get("message") || "") }) });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Unable to send your message.");
      formElement.reset();
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  return <section className="container-page py-14"><form onSubmit={submit} className="card mx-auto max-w-xl"><p className="eyebrow">Contact us</p><h1 className="mt-2 text-3xl font-bold">We&apos;d love to hear from you</h1><p className="mt-2 text-sm text-stone-500">Questions, feedback or support — send us a note.</p><label className="mt-6 block text-sm font-medium" htmlFor="contact-name">Your name</label><input id="contact-name" required name="name" autoComplete="name" className="input mt-2" placeholder="Your name"/><label className="mt-3 block text-sm font-medium" htmlFor="contact-email">Email address</label><input id="contact-email" required name="email" type="email" autoComplete="email" className="input mt-2" placeholder="Email address"/><label className="mt-3 block text-sm font-medium" htmlFor="contact-message">Message</label><textarea id="contact-message" required name="message" minLength={5} className="input mt-2 min-h-32" placeholder="How can we help?"/>{sent ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">Thank you! Our team will get back to you shortly.</p> : <button disabled={sending} className="btn-primary mt-5">{sending ? "Sending…" : "Send message"}</button>}{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}</form></section>;
}
