"use client";

import { useEffect, useState } from "react";

type AdminTest = { id: string; title: string; main_category: string; subcategory: string; featured: boolean };

export function FeaturedTestsAdmin() {
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/featured-tests", { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as { data?: AdminTest[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load mock tests.");
      setTests(body.data || []);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load mock tests."));
  }, []);

  const setFeatured = async (test: AdminTest, featured: boolean) => {
    setSaving(test.id);
    setError("");
    try {
      const response = await fetch("/api/admin/featured-tests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testId: test.id, featured }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update featured status.");
      setTests((current) => current.map((item) => item.id === test.id ? { ...item, featured } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update featured status.");
    } finally {
      setSaving(null);
    }
  };

  return <section className="container-page py-10"><div className="max-w-4xl"><p className="eyebrow">Administrator</p><h1 className="mt-2 text-3xl font-bold">Featured mock tests</h1><p className="mt-3 text-stone-500">Only selected tests appear in the homepage Featured mock tests section.</p>{error && <p className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="card mt-6 overflow-x-auto !p-0"><table className="min-w-full text-left text-sm"><thead className="bg-stone-50 text-stone-500"><tr><th className="p-4">Test</th><th className="p-4">Category</th><th className="p-4 text-right">Featured</th></tr></thead><tbody>{tests.map((test) => <tr className="border-t" key={test.id}><td className="p-4 font-medium">{test.title}</td><td className="p-4 text-stone-500">{test.main_category} · {test.subcategory}</td><td className="p-4 text-right"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={test.featured} disabled={saving === test.id} onChange={(event) => setFeatured(test, event.target.checked)} /><span>{test.featured ? "Selected" : "Not selected"}</span></label></td></tr>)}{!tests.length && !error && <tr><td className="p-4 text-stone-500" colSpan={3}>No published tests found.</td></tr>}</tbody></table></div></div></section>;
}
