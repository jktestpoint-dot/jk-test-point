import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FreeSubjectPracticeRunner } from "@/components/FreeSubjectPracticeRunner";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";

export default async function FreeSubjectPracticeAttemptPage({ params }: { params: { subject: string } }) {
  if (!getMcqPracticeSubject(params.subject)) return notFound();
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || !await getAuthenticatedStudent(token)) redirect(`/login?next=/free-mcq-practice/${params.subject}/attempt`);
  return <FreeSubjectPracticeRunner subject={params.subject} />;
}
