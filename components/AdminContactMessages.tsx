"use client";

import { useEffect, useState } from "react";

type ContactMessage = { id: string; name: string; email: string; message: string; created_at: string };

export function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/contact-messages", { cache: "no-store" }).then(async (response) => ({ response, body: await response.json() as { data?: ContactMessage[]; error?: string } })).then(({ response, body }) => {
      if (!response.ok) throw new Error(body.error || "Unable to load contact messages.");
      setMessages(body.data || []);
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load contact messages."));
  }, []);
  const remove = async (id: string) => { if (!window.confirm("Delete this contact message?")) return; setDeleting(id); setError(""); try { const response = await fetch(`/api/admin/contact-messages?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const body = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(body.error || "Unable to delete contact message."); setMessages((current) => current.filter((message) => message.id !== id)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to delete contact message."); } finally { setDeleting(null); } };
  return <section className="container-page py-10"><div className="max-w-5xl"><p className="eyebrow">Administrator</p><h1 className="mt-2 text-3xl font-bold">Contact messages</h1><p className="mt-3 text-stone-500">Messages submitted through the Contact Us form.</p>{error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="mt-6 space-y-4">{messages.map((item) => { const replyHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.email)}&su=${encodeURIComponent("Re: JK Test Point Contact")}&body=${encodeURIComponent(`Hi ${item.name},\n\nThank you for contacting JK Test Point.\n\nBest regards,\nJK Test Point Team`)}`; return <article className="card" key={item.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">{item.name}</h2><div className="flex flex-wrap items-center gap-3"><a className="text-sm text-brand-700" href={`mailto:${item.email}`}>{item.email}</a><a className="btn-secondary !px-3 !py-1.5 text-xs" href={replyHref} target="_blank" rel="noopener noreferrer">Reply</a><button type="button" className="btn-secondary !px-3 !py-1.5 text-xs text-rose-700" disabled={deleting === item.id} onClick={() => remove(item.id)}>{deleting === item.id ? "Deleting…" : "Delete"}</button></div></div><time className="text-xs text-stone-500">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-700">{item.message}</p></article>; })}{!messages.length && !error && <div className="card text-sm text-stone-500">No contact messages yet.</div>}</div></div></section>;
}
