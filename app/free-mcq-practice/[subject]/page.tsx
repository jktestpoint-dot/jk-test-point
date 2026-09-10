import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";

export default async function FreeMcqPracticeSubjectPage({ params }: { params: { subject: string } }) {
  const subject = getMcqPracticeSubject(params.subject);
  if (!subject) return notFound();
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || !await getAuthenticatedStudent(token)) redirect(`/login?next=/free-mcq-practice/${subject.id}`);
  return <section className="container-page section-space"><div className="mx-auto max-w-4xl"><div className="page-intro"><p className="eyebrow">Free preparation</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{subject.name} Free MCQ Practice</h1><p className="mt-4 max-w-2xl text-lg leading-7 text-stone-600">Practice the free MCQs selected for {subject.name}.</p></div><div className="mt-6"><a className="btn-primary inline-flex" href={`/free-mcq-practice/${encodeURIComponent(subject.id)}/attempt`}>Start Free Practice</a></div></div></section>;
}
