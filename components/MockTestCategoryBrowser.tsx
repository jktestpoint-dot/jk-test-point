import Link from "next/link";
import { MAIN_CATEGORIES, type CatalogTest } from "@/lib/mock-test-types";

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const JKSSB_SUBCATEGORIES = ["Accounts Assistant", "JKPSI", "JKP Constable", "AHTO", "Junior Assistant", "Supervisor"];

export function MockTestCategoryIndex() {
  return <section className="container-page section-space">
    <div className="page-intro"><p className="eyebrow">Test library</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Browse Mock Tests</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Choose an exam category to find the mock tests available for your preparation.</p></div>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {MAIN_CATEGORIES.map((category) => <Link key={category} href={`/mock-tests/category/${slugify(category)}`} className="card card-lift group"><p className="eyebrow">Mock tests</p><h2 className="mt-2 text-xl font-bold text-stone-800 group-hover:text-brand-700">{category}</h2><p className="mt-3 text-sm text-stone-600">Browse {category} practice tests.</p><span className="mt-5 inline-block text-sm font-bold text-brand-700">View category →</span></Link>)}
    </div>
  </section>;
}

export function MockTestCategoryPage({ category, tests }: { category: string; tests: CatalogTest[] }) {
  const categoryLabel = tests[0]?.main_category ?? category;
  const subcategories = categoryLabel === "JKSSB" ? Array.from(new Set([...JKSSB_SUBCATEGORIES, ...tests.map((test) => test.subcategory)])) : Array.from(new Set(tests.map((test) => test.subcategory)));
  return <section className="container-page section-space">
    <Link href="/mock-tests" className="text-sm font-semibold text-brand-700 hover:text-brand-800">← All mock-test categories</Link>
    <div className="page-intro mt-5"><p className="eyebrow">Mock tests · {categoryLabel}</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{categoryLabel} Mock Tests</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Choose a subcategory to view its available mock tests.</p></div>
    {subcategories.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{subcategories.map((subcategory) => { const count = tests.filter((test) => test.subcategory === subcategory).length; return <Link key={subcategory} href={`/mock-tests/category/${slugify(subcategory)}`} className="card card-lift group"><p className="eyebrow">{categoryLabel}</p><h2 className="mt-2 text-xl font-bold text-stone-800 group-hover:text-brand-700">{subcategory}</h2><p className="mt-3 text-sm text-stone-600">{count ? `${count} mock test${count === 1 ? "" : "s"} available` : "Mock tests coming soon"}</p><span className="mt-5 inline-block text-sm font-bold text-brand-700">View mocks →</span></Link>; })}</div> : <div className="card mt-8 text-sm text-stone-500">No published mock-test subcategories are available yet.</div>}
  </section>;
}
