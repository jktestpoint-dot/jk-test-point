import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SubjectPracticeRunner } from "@/components/SubjectPracticeRunner";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { hasActiveSubjectEntitlement } from "@/lib/subject-entitlement";

export default async function SubjectPracticeAttemptPage({ params }: { params: { subject: string } }) {
  if (!getMcqPracticeSubject(params.subject)) return notFound();
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || !await getAuthenticatedStudent(token)) redirect(`/login?next=/mcq-practice/${params.subject}/attempt`);
  if (!await hasActiveSubjectEntitlement(token, params.subject)) redirect(`/mcq-practice/${params.subject}`);
  return <SubjectPracticeRunner subject={params.subject} />;
}
