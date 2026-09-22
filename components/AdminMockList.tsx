"use client";

import { useEffect, useState } from "react";

type AdminTest = { id: string; title: string; main_category: string; subcategory: string; question_count: number; duration_minutes: number; price: number };

export function AdminMockList() {
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingQuestions, setClearingQuestions] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tests", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { data?: AdminTest[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load mock tests.");
      setTests(Array.isArray(body.data) ? body.data : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load mock tests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const remove = async (test: AdminTest) => {
    if (!window.confirm(`Delete ${test.title} and all of its questions? This cannot be undone.`)) return;
    setDeleting(test.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/tests?id=${encodeURIComponent(test.id)}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { data?: { deleted?: boolean }; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to delete the mock test.");
      setMessage(body.data?.deleted ? `${test.title} was deleted.` : "That mock test was not found.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete the mock test.");
    } finally {
      setDeleting(null);
    }
  };

  const removeQuestions = async (test: AdminTest) => {
    if (!window.confirm(`Delete all ${test.question_count} questions from ${test.title}? The mock test itself will remain. This cannot be undone.`)) return;
    setClearingQuestions(test.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/tests/${encodeURIComponent(test.id)}/questions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedCount: test.question_count }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { deletedCount?: number }; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to delete mock questions.");
      setMessage(`${body.data?.deletedCount ?? 0} questions were deleted from ${test.title}. The mock test was kept.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete mock questions.");
    } finally {
      setClearingQuestions(null);
    }
  };

  return <div className="mt-8"><h2 className="text-xl font-bold">Published mock tests</h2>{message && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{loading ? <p className="mt-4 text-sm text-stone-500">Loading mock tests…</p> : <div className="card mt-4 overflow-x-auto !p-0"><table className="min-w-full text-left text-sm"><thead className="bg-stone-50 text-stone-500"><tr><th className="p-4">Test</th><th className="p-4">Details</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{tests.map((test) => <tr className="border-t" key={test.id}><td className="p-4"><p className="font-medium">{test.title}</p><p className="text-xs text-stone-500">{test.id}</p></td><td className="p-4 text-stone-500">{test.main_category} · {test.subcategory} · {test.question_count} questions · {test.duration_minutes} minutes · ₹{test.price}</td><td className="p-4 text-right"><div className="flex flex-wrap justify-end gap-2"><button type="button" className="btn-secondary !px-3 !py-1.5 text-xs text-rose-700" disabled={deleting === test.id || clearingQuestions === test.id} onClick={() => removeQuestions(test)}>{clearingQuestions === test.id ? "Deleting questions…" : "Delete All Questions"}</button><button type="button" className="btn-secondary !px-3 !py-1.5 text-xs text-rose-700" disabled={deleting === test.id || clearingQuestions === test.id} onClick={() => remove(test)}>{deleting === test.id ? "Deleting…" : "Delete"}</button></div></td></tr>)}{!tests.length && <tr><td className="p-4 text-sm text-stone-500" colSpan={3}>No published mock tests found.</td></tr>}</tbody></table></div>}</div>;
}
