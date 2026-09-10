import Link from "next/link";
import { MCQ_PRACTICE_SUBJECTS } from "@/lib/mcq-practice";
import { getAvailableFreePracticeSubjects } from "@/lib/free-subject-catalog";

export default async function Pricing() {
  const freePracticeSubjects = await getAvailableFreePracticeSubjects().catch(() => []);
  const firstFreePracticeSubject = freePracticeSubjects[0];
  return <section className="container-page py-12 text-center">
    <p className="eyebrow">Subject-wise preparation</p>
    <h1 className="mt-2 text-4xl font-bold">MCQ Practice</h1>
    <p className="mt-3 text-stone-500">Choose a subject and practise with its dedicated MCQ question bank.</p>
    <div className="mt-10 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
      {MCQ_PRACTICE_SUBJECTS.map((subject) => <article className="card" key={subject.id}>
        <h2 className="text-xl font-bold">{subject.name}</h2>
        <p className="mt-2 text-sm text-stone-500">{subject.mcqCount} MCQs</p>
        <b className="mt-5 block text-3xl text-brand-700">₹{subject.price}</b>
        <p className="mt-1 text-sm text-stone-500">Per subject</p>
        <Link href={`/mcq-practice/${subject.id}`} className="btn-primary mt-7 w-full">Start Practice</Link>
      </article>)}
    </div>
    {firstFreePracticeSubject && <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-brand-100 bg-brand-50 p-5 text-left sm:flex sm:items-center sm:justify-between sm:gap-5"><div><p className="text-sm font-bold text-brand-700">Free MCQ Practice</p><p className="mt-1 text-sm text-stone-600">Try {firstFreePracticeSubject.freeQuestionCount} free {firstFreePracticeSubject.name} MCQ{firstFreePracticeSubject.freeQuestionCount === 1 ? "" : "s"} before purchasing a subject set.</p></div><Link href={`/free-mcq-practice/${firstFreePracticeSubject.id}`} className="btn-secondary mt-4 shrink-0 sm:mt-0">Start Free Practice</Link></div>}
  </section>;
}
