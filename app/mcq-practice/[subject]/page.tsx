import { notFound } from "next/navigation";
import Link from "next/link";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { getSubjectQuestionCount } from "@/lib/subject-mcq";

export default async function McqPracticeSubjectPage({ params }: { params: { subject: string } }) {
  const subject = getMcqPracticeSubject(params.subject);
  if (!subject) return notFound();
  const questionCount = await getSubjectQuestionCount(subject.id).catch(() => 0);

  return <section className="container-page section-space"><div className="mx-auto max-w-4xl"><div className="page-intro"><p className="eyebrow">Subject-wise preparation</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{subject.name} MCQ Practice</h1><p className="mt-4 max-w-2xl text-lg leading-7 text-stone-600">Practice {subject.name} MCQs and improve your preparation.</p><div className="mt-7 flex flex-wrap items-center gap-3"><b className="text-xl text-brand-700">₹{subject.price}</b><span className="h-1 w-1 rounded-full bg-brand-300" /><span className="text-sm font-medium text-stone-500">Per subject</span></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="meta-tile"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">Practice set</p><b className="mt-2 block text-lg text-stone-800">{subject.mcqCount} MCQs</b></div><div className="meta-tile"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">Imported questions</p><b className="mt-2 block text-lg text-stone-800">{questionCount}</b></div><div className="meta-tile"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">Subject price</p><b className="mt-2 block text-lg text-stone-800">₹{subject.price}</b></div></div><Link href={`/mcq-practice/${subject.id}/attempt`} className="btn-primary mt-6">Start Practice</Link></div></section>;
}
