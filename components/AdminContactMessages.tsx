"use client";

import { useEffect, useState } from "react";

type ContactMessage = { id: string; name: string; email: string; message: string; created_at: string };

export function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/contact-messages", { cache: "no-store" }).then(async (response) => ({ response, body: await response.json() as { data?: ContactMessage[]; error?: string } })).then(({ response, body }) => {
      if (!response.ok) throw new Error(body.error || "Unable to load contact messages.");
      setMessages(body.data || []);
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load contact messages."));
  }, []);
  return <section className="container-page py-10"><div className="max-w-5xl"><p className="eyebrow">Administrator</p><h1 className="mt-2 text-3xl font-bold">Contact messages</h1><p className="mt-3 text-slate-500">Messages submitted through the Contact Us form.</p>{error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="mt-6 space-y-4">{messages.map((item) => <article className="card" key={item.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">{item.name}</h2><a className="text-sm text-brand-700" href={`mailto:${item.email}`}>{item.email}</a></div><time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p></article>)}{!messages.length && !error && <div className="card text-sm text-slate-500">No contact messages yet.</div>}</div></div></section>;
}
