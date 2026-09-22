import Link from "next/link";
import type { Metadata } from "next";
import { getAvailableFreePracticeSubjects } from "@/lib/free-subject-catalog";

export const metadata: Metadata = {
  title: "Free MCQ Practice | JK Test Point",
  description: "Browse free subject-wise MCQ practice for Jammu & Kashmir and competitive-exam preparation.",
  alternates: { canonical: "/free-mcq-practice" },
  openGraph: { title: "Free MCQ Practice | JK Test Point", description: "Browse free subject-wise MCQ practice for Jammu & Kashmir and competitive-exam preparation.", url: "/free-mcq-practice", type: "website" },
  twitter: { card: "summary", title: "Free MCQ Practice | JK Test Point", description: "Browse free subject-wise MCQ practice for Jammu & Kashmir and competitive-exam preparation." },
};

export default async function FreeMcqPracticePage() {
  const subjects = await getAvailableFreePracticeSubjects().catch(() => []);

  return <section className="container-page section-space"><div className="mx-auto max-w-5xl"><div className="page-intro"><p className="eyebrow">No purchase required</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Free MCQ Practice</h1><p className="mt-4 max-w-2xl text-lg leading-7 text-stone-600">Choose a free subject and start practicing with selected questions.</p></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{subjects.map((subject) => <article className="card card-lift" key={subject.id}><div className="flex items-start justify-between gap-3"><h2 className="font-bold text-stone-800">{subject.name}</h2><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">Free</span></div><p className="mt-3 text-sm text-stone-500">{subject.freeQuestionCount} free MCQ{subject.freeQuestionCount === 1 ? "" : "s"} available</p>{subject.freeQuestionCount > 0 ? <Link href={"/free-mcq-practice/" + subject.id} className="btn-primary mt-5 w-full !px-4 !py-2">Start Free Practice</Link> : <span className="mt-5 block rounded-lg bg-stone-100 px-4 py-2 text-center text-sm font-semibold text-stone-500">Coming soon</span>}</article>)}</div></div></section>;
}
