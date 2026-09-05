import { notFound } from "next/navigation";
import { SubjectPracticeRunner } from "@/components/SubjectPracticeRunner";
import { getMcqPracticeSubject } from "@/lib/mcq-practice";

export default function SubjectPracticeAttemptPage({ params }: { params: { subject: string } }) {
  if (!getMcqPracticeSubject(params.subject)) return notFound();
  return <SubjectPracticeRunner subject={params.subject} />;
}
