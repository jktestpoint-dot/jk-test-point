import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAvailableFreePracticeSubjects, getFreeSubjectDefinition } from "@/lib/free-subject-catalog";

export async function generateMetadata({ params }: { params: { subject: string } }): Promise<Metadata> {
  const subject = getFreeSubjectDefinition(params.subject);
  if (!subject) return { robots: { index: false, follow: false } };
  const title = `${subject.name} Free MCQ Practice`;
  const description = `Practice free ${subject.name} MCQs for JKSSB, SSC and competitive-exam preparation on JK Test Point.`;
  const path = `/free-mcq-practice/${encodeURIComponent(subject.id)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function FreeMcqPracticeSubjectPage({ params }: { params: { subject: string } }) {
  const subject = getFreeSubjectDefinition(params.subject);
  if (!subject) return notFound();
  const available = await getAvailableFreePracticeSubjects().catch(() => []);
  const questionCount = available.find((item) => item.id === subject.id)?.freeQuestionCount ?? 0;
  return <section className="container-page section-space"><div className="mx-auto max-w-4xl"><div className="page-intro"><p className="eyebrow">Free preparation</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{subject.name} Free MCQ Practice</h1><p className="mt-4 max-w-2xl text-lg leading-7 text-stone-600">Practice free {subject.name} MCQs selected for JKSSB, SSC and competitive-exam preparation.</p><p className="mt-3 text-sm font-medium text-stone-500">{questionCount} free MCQ{questionCount === 1 ? "" : "s"} available · Sign in to begin an attempt and save your result.</p></div><div className="mt-6">{questionCount > 0 ? <Link className="btn-primary inline-flex" href={`/free-mcq-practice/${encodeURIComponent(subject.id)}/attempt`}>Start Free Practice</Link> : <span className="inline-flex rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-500">Coming soon</span>}</div></div></section>;
}
