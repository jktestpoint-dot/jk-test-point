import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedCatalogTest } from "@/lib/test-catalog";

export default async function TestDetails({ params }: { params: { id: string } }) {
  const test = await getPublishedCatalogTest(params.id).catch(() => null);
  if (!test) return notFound();
  const details = [["Questions", test.question_count], ["Duration", `${test.duration_minutes} minutes`], ["Total marks", test.total_marks], ["Negative marking", test.negative_marking]];

  return <section className="container-page section-space"><div className="mx-auto max-w-4xl">
    <div className="page-intro"><p className="eyebrow">{test.main_category} · {test.subcategory}</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="max-w-3xl text-3xl font-bold sm:text-4xl">{test.title}</h1>{test.question_count === 0 && <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">Coming Soon</span>}</div><p className="mt-4 max-w-3xl text-lg leading-7 text-stone-600">{test.description}</p><div className="mt-7 flex flex-wrap items-center gap-3"><b className="text-xl text-brand-700">{test.price ? `₹${test.price}` : "Free test"}</b><span className="h-1 w-1 rounded-full bg-brand-300" /><span className="text-sm font-medium text-stone-500">Mock test details</span></div></div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{details.map(([label, value]) => <div className="meta-tile" key={String(label)}><p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p><b className="mt-2 block text-lg text-stone-800">{value}</b></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]"><article className="card"><h2 className="text-lg font-bold">Instructions</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-stone-600"><li>Read every question carefully before selecting an answer.</li><li>You may move between questions using the palette.</li><li>Use Mark for Review to revisit a question before submission.</li><li>The timer begins as soon as you start the test.</li></ul></article><div className="card flex flex-col justify-center sm:min-w-56"><p className="text-sm text-stone-500">Ready to begin?</p><Link href={`/mock-tests/${test.id}/attempt`} className="btn-primary mt-4 w-full">Start Test →</Link></div></div>
  </div></section>;
}
