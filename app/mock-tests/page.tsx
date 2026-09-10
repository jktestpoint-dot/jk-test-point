"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MAIN_CATEGORIES, type CatalogTest } from "@/lib/mock-test-types";

type ApiResponse = { data?: CatalogTest[]; error?: string };

function TestCard({ test }: { test: CatalogTest }) {
  const isPaid = Boolean(test.price);
  return <article className="card card-lift flex h-full flex-col" key={test.id}>
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold text-brand-600">{test.main_category} · {test.subcategory}</span>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isPaid ? "bg-brand-50 text-brand-700" : "bg-emerald-50 text-emerald-700"}`}>{isPaid ? "Paid" : "Free"}</span>
        {test.question_count === 0 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">Coming Soon</span>}
      </div>
    </div>
    <h2 className="mt-3 font-bold">{test.title}</h2>
    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
      <span className="rounded-lg bg-stone-50 px-2.5 py-1.5">{test.question_count} Questions</span>
      <span className="rounded-lg bg-stone-50 px-2.5 py-1.5">{test.duration_minutes} minutes</span>
    </div>
    <div className="mt-auto flex items-center justify-between gap-4 pt-5">
      <div><p className="text-xs font-medium text-stone-500">{isPaid ? "Test price" : "Access"}</p><b className="text-brand-700">{test.price ? `₹${test.price}` : "Free"}</b></div>
      <Link className="btn-primary shrink-0 !px-4 !py-2" href={`/mock-tests/${test.id}`}>Start Test</Link>
    </div>
  </article>;
}

export default function MockTests() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tests, setTests] = useState<CatalogTest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/tests", { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(body.error || "Unable to load mock tests.");
      return body.data || [];
    }).then((data) => { if (active) setTests(data); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load mock tests.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const grouped = useMemo(() => MAIN_CATEGORIES.map((main) => ({
    main,
    tests: tests.filter((test) => test.main_category === main).sort((a, b) => a.subcategory.localeCompare(b.subcategory) || a.title.localeCompare(b.title)),
  })), [tests]);
  const shown = useMemo(() => tests.filter((test) => {
    const [main, subcategory] = category.split("::");
    const matchesCategory = category === "All" || (test.main_category === main && (!subcategory || test.subcategory === subcategory));
    return matchesCategory && `${test.title} ${test.main_category} ${test.subcategory}`.toLowerCase().includes(query.toLowerCase());
  }), [category, query, tests]);
  const availableCategories = useMemo(() => Array.from(new Set(tests.map((test) => test.main_category))), [tests]);
  const activeMainCategory = category === "All" ? "All" : category.split("::")[0];

  return <section className="container-page section-space"><div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8"><p className="eyebrow">Test library</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Find your next mock test</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Browse by exam category or search for the practice test you need.</p>
    <div className="mt-7 grid gap-3 md:grid-cols-[1fr_auto]"><input className="input bg-white" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tests, exams or topics..." />
      <select className="input md:w-56" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="All">All categories</option>{grouped.map((group) => <optgroup key={group.main} label={group.main}>{Array.from(new Set(group.tests.map((test) => test.subcategory))).map((subcategory) => <option key={subcategory} value={`${group.main}::${subcategory}`}>{subcategory}</option>)}</optgroup>)}</select>
    </div>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Quick category filters">
      <button type="button" onClick={() => setCategory("All")} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${activeMainCategory === "All" ? "border-brand-600 bg-brand-600 text-white" : "border-brand-100 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700"}`}>All</button>
      {availableCategories.map((main) => <button type="button" key={main} onClick={() => setCategory(main)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${activeMainCategory === main ? "border-brand-600 bg-brand-600 text-white" : "border-brand-100 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700"}`}>{main}</button>)}
    </div></div>
    {loading && <div className="card mt-6 text-center text-stone-500">Loading mock tests…</div>}
    {!loading && error && <div className="card mt-6 text-center text-rose-700">{error}</div>}
    {!loading && !error && category === "All" && !query && <div className="mt-10 space-y-10" aria-label="Mock tests by category">{grouped.map((group) => <section key={group.main}><div className="flex items-center gap-3"><span className="h-px flex-1 bg-brand-100" /><h2 className="text-lg font-bold text-brand-700">{group.main}</h2><span className="h-px flex-1 bg-brand-100" /></div>{group.tests.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{group.tests.map((test) => <TestCard key={test.id} test={test} />)}</div> : <div className="card mt-5 text-sm text-stone-500">No published tests in this category yet.</div>}</section>)}</div>}
    {!loading && !error && (category !== "All" || query) && <><p className="mt-6 text-sm text-stone-500">{shown.length} test{shown.length !== 1 ? "s" : ""} found</p><div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{shown.map((test) => <TestCard key={test.id} test={test} />)}</div>{!shown.length && <div className="card mt-5 text-center text-stone-500">No tests match these filters. Try a different search.</div>}</>}
  </section>;
}
