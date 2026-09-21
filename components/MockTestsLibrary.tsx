"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type CatalogTest } from "@/lib/mock-test-types";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function TestCard({ test }: { test: CatalogTest }) {
  const isPaid = Boolean(test.price);
  return <article className="card card-lift flex h-full flex-col" key={test.id}>
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold text-brand-600">{test.main_category} · {test.subcategory}</span>
      <div className="flex shrink-0 flex-wrap justify-end gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isPaid ? "bg-brand-50 text-brand-700" : "bg-emerald-50 text-emerald-700"}`}>{isPaid ? "Paid" : "Free"}</span>{test.question_count === 0 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">Coming Soon</span>}</div>
    </div>
    <h2 className="mt-3 font-bold">{test.title}</h2>
    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-stone-600"><span className="rounded-lg bg-stone-50 px-2.5 py-1.5">{test.question_count} Questions</span><span className="rounded-lg bg-stone-50 px-2.5 py-1.5">{test.duration_minutes} minutes</span></div>
    <div className="mt-auto flex items-center justify-between gap-4 pt-5"><div><p className="text-xs font-medium text-stone-500">{isPaid ? "Test price" : "Access"}</p><b className="text-brand-700">{test.price ? `₹${test.price}` : "Free"}</b></div><Link className="btn-primary shrink-0 !px-4 !py-2" href={`/mock-tests/${test.id}`}>Start Test</Link></div>
  </article>;
}

export default function MockTestsLibrary({ initialTests, initialError = "" }: { initialTests: CatalogTest[]; initialError?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const tests = initialTests;
  const availableCategories = useMemo(() => {
    const categories = Array.from(new Set(tests.map((test) => test.main_category))).sort();
    return categories.includes("JKSSB") ? ["JKSSB", ...categories.filter((category) => category !== "JKSSB")] : categories;
  }, [tests]);
  const grouped = useMemo(() => availableCategories.map((main) => ({ main, tests: tests.filter((test) => test.main_category === main).sort((a, b) => a.subcategory.localeCompare(b.subcategory) || a.title.localeCompare(b.title)) })), [availableCategories, tests]);
  const shown = useMemo(() => tests.filter((test) => { const [main, subcategory] = category.split("::"); const matchesCategory = category === "All" || (test.main_category === main && (!subcategory || test.subcategory === subcategory)); return matchesCategory && `${test.title} ${test.main_category} ${test.subcategory}`.toLowerCase().includes(query.toLowerCase()); }), [category, query, tests]);
  const activeMainCategory = category === "All" ? "All" : category.split("::")[0];
  const handleCategoryChange = (value: string) => {
    if (value.includes("::")) {
      const [, subcategory] = value.split("::");
      window.location.assign(`/mock-tests/category/${slugify(subcategory)}`);
      return;
    }
    setCategory(value);
  };
  return <section className="container-page section-space"><div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8"><p className="eyebrow">Test library</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Find your next mock test</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Browse published mock tests by exam category or search term. Each card shows the available question count, duration and access price.</p><div className="mt-7 grid gap-3 md:grid-cols-[1fr_auto]"><input className="input bg-white" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tests, exams or topics..." /><select className="input md:w-56" value={category} onChange={(event) => handleCategoryChange(event.target.value)} aria-label="Filter by category"><option value="All">All categories</option>{grouped.map((group) => <optgroup key={group.main} label={group.main}>{Array.from(new Set(group.tests.map((test) => test.subcategory))).map((subcategory) => <option key={subcategory} value={`${group.main}::${subcategory}`}>{subcategory}</option>)}</optgroup>)}</select></div><div className="mt-4 flex flex-wrap gap-2" aria-label="Quick category filters"><button type="button" onClick={() => setCategory("All")} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${activeMainCategory === "All" ? "border-brand-600 bg-brand-600 text-white" : "border-brand-100 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700"}`}>All</button>{availableCategories.map((main) => <button type="button" key={main} onClick={() => setCategory(main)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${activeMainCategory === main ? "border-brand-600 bg-brand-600 text-white" : "border-brand-100 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700"}`}>{main}</button>)}</div></div><div className="mt-8 grid gap-5 lg:grid-cols-2"><article className="card"><h2 className="text-lg font-bold text-stone-800">JKSSB mock-test preparation</h2><p className="mt-2 text-sm leading-6 text-stone-600">Use the published JKSSB tests shown in this catalogue to practise within the configured question count and time limit. Available subcategories and test details come directly from the current catalogue.</p></article><article className="card"><h2 className="text-lg font-bold text-stone-800">How mock tests work</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-stone-600"><li>Choose a published test and review its questions, duration and access details.</li><li>Start the test when access is available and work through the timed questions.</li><li>Submit the attempt to view the existing result and review flow.</li></ol></article></div>{initialError && <div className="card mt-6 text-center text-rose-700">{initialError}</div>}{!initialError && category === "All" && !query && <div className="mt-10 space-y-10" aria-label="Mock tests by category">{grouped.map((group) => <section key={group.main}><div className="flex items-center gap-3"><span className="h-px flex-1 bg-brand-100" /><h2 className="text-lg font-bold text-brand-700">{group.main}</h2><span className="h-px flex-1 bg-brand-100" /></div>{group.tests.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{group.tests.map((test) => <TestCard key={test.id} test={test} />)}</div> : <div className="card mt-5 text-sm text-stone-500">No published tests in this category yet.</div>}</section>)}</div>}{!initialError && (category !== "All" || query) && <><p className="mt-6 text-sm text-stone-500">{shown.length} test{shown.length !== 1 ? "s" : ""} found</p><div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{shown.map((test) => <TestCard key={test.id} test={test} />)}</div>{!shown.length && <div className="card mt-5 text-center text-stone-500">No tests match these filters. Try a different search.</div>}</>}<section className="mt-10 card"><h2 className="text-lg font-bold text-stone-800">Mock-test FAQs</h2><div className="mt-4 space-y-4 text-sm leading-6 text-stone-600"><div><h3 className="font-semibold text-stone-800">What tests are available?</h3><p className="mt-1">This page lists published tests from the configured exam categories. Use the search and category controls to find a matching test.</p></div><div><h3 className="font-semibold text-stone-800">How do I compare tests?</h3><p className="mt-1">Compare the question count, duration and displayed access price on each card before opening its details.</p></div><div><h3 className="font-semibold text-stone-800">What does Coming Soon mean?</h3><p className="mt-1">It means the published catalogue entry currently has no available questions.</p></div><div><h3 className="font-semibold text-stone-800">Where can I see my result?</h3><p className="mt-1">After submitting an attempt, the existing result and review flow shows the outcome for that test.</p></div></div></section></section>;
}
