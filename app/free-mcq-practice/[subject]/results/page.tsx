"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FreeSubjectPracticeResult } from "@/components/FreeSubjectPracticeResult";

function FreeSubjectPracticeResultsContent({ subject }: { subject: string }) {
  const attempt = useSearchParams().get("attempt");
  if (!attempt) return <section className="container-page py-10"><div className="card text-center text-rose-700">Free practice result not found.</div></section>;
  return <FreeSubjectPracticeResult subject={subject} attempt={attempt} />;
}

export default function FreeSubjectPracticeResultsPage({ params }: { params: { subject: string } }) {
  return <Suspense fallback={<section className="container-page py-10"><div className="card text-center text-stone-500">Loading free practice result…</div></section>}><FreeSubjectPracticeResultsContent subject={params.subject} /></Suspense>;
}
