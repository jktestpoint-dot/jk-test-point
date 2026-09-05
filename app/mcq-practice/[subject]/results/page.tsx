"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SubjectPracticeResult } from "@/components/SubjectPracticeResult";

function SubjectPracticeResultsContent({ subject }: { subject: string }) {
  const attempt = useSearchParams().get("attempt");
  if (!attempt) return <section className="container-page py-10"><div className="card text-center text-rose-700">Practice result not found.</div></section>;
  return <SubjectPracticeResult subject={subject} attempt={attempt} />;
}

export default function SubjectPracticeResultsPage({ params }: { params: { subject: string } }) {
  return <Suspense fallback={<section className="container-page py-10"><div className="card text-center text-stone-500">Loading practice result…</div></section>}><SubjectPracticeResultsContent subject={params.subject} /></Suspense>;
}
