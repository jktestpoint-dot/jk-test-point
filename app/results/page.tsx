"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PublicTestQuestion } from "@/lib/mock-test-types";

type SubmittedQuestionReview = {
  question_id: string;
  question_number: number;
  question_text: string;
  selected_option: string | null;
  selected_answer: string | null;
  correct_option: string;
  correct_answer: string;
  status: "correct" | "incorrect" | "unattempted";
  explanation: string | null;
};

type Result = {
  answers: (number | undefined)[];
  score: number;
  time: number;
  questions: PublicTestQuestion[];
  review?: SubmittedQuestionReview[];
  totalQuestions?: number;
  correct?: number;
  incorrect?: number;
  unattempted?: number;
};

function ResultsContent() {
  const [result, setResult] = useState<Result | null>(null);
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt");
  const testId = searchParams.get("test");

  useEffect(() => {
    const raw = sessionStorage.getItem("jk-result");
    const inMemoryResult = raw ? JSON.parse(raw) as Result : null;
    setResult(inMemoryResult);

    if (!attemptId && !testId) return;
    const params = new URLSearchParams();
    if (attemptId) params.set("attempt", attemptId); else if (testId) params.set("test", testId);
    fetch(`/api/attempts?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json().catch(() => null) as { data?: { score?: number; review?: SubmittedQuestionReview[] } | null } | null }))
      .then(({ response, body }) => {
        const stored = body?.data;
        if (!response.ok || !stored || !Array.isArray(stored.review) || !stored.review.length) return;
        const review = stored.review;
        setResult({
          answers: review.map((question) => question.selected_option ? question.selected_option.charCodeAt(0) - 65 : undefined),
          score: Number(stored.score ?? 0),
          time: inMemoryResult?.time ?? 0,
          questions: review.map((question) => ({ id: question.question_id, question_number: question.question_number, text: question.question_text, options: [] })),
          review,
          totalQuestions: review.length,
          correct: review.filter((question) => question.status === "correct").length,
          incorrect: review.filter((question) => question.status === "incorrect").length,
          unattempted: review.filter((question) => question.status === "unattempted").length,
        });
      })
      .catch(() => undefined);
  }, [attemptId, testId]);

  if (!result || !Array.isArray(result.questions)) {
    return <section className="container-page py-20 text-center"><h1 className="text-2xl font-bold">No submitted test yet</h1><Link href="/mock-tests" className="btn-primary mt-5">Browse mock tests</Link></section>;
  }

  const { questions } = result;
  const totalQuestions = result.totalQuestions ?? questions.length;
  const attempted = result.answers.filter((answer) => answer !== undefined).length;
  const correct = result.correct ?? result.score;
  const incorrect = result.incorrect ?? Math.max(0, attempted - correct);
  const unattempted = result.unattempted ?? Math.max(0, totalQuestions - attempted);
  const review = Array.isArray(result.review) ? result.review : questions.map((question, index) => {
    const answer = result.answers[index];
    return {
      question_id: question.id,
      question_number: question.question_number,
      question_text: question.text,
      selected_option: answer === undefined ? null : String.fromCharCode(65 + answer),
      selected_answer: answer === undefined ? null : question.options[answer],
      correct_option: "",
      correct_answer: "",
      status: answer === undefined ? "unattempted" : "incorrect",
      explanation: null,
    } as SubmittedQuestionReview;
  });

  return <section className="container-page py-10"><p className="eyebrow">Test complete</p><h1 className="mt-2 text-3xl font-bold">Here&apos;s how you performed</h1><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="card bg-brand-700 !text-white"><p className="text-sm text-brand-100">Your score</p><b className="mt-2 block text-4xl">{result.score}/{totalQuestions}</b><p className="mt-1 text-sm text-brand-100">{totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0}% accuracy</p></div>{[["Correct", correct, "text-emerald-600"], ["Incorrect", incorrect, "text-rose-600"], ["Unattempted", unattempted, "text-amber-600"]].map(([label, value, colour]) => <div className="card" key={String(label)}><p className="text-sm text-stone-500">{label}</p><b className={`mt-2 block text-4xl ${colour}`}>{value}</b><p className="mt-1 text-sm text-stone-500">Time taken: {Math.floor(result.time / 60)}m {result.time % 60}s</p></div>)}</div><div className="card mt-7"><div className="flex justify-between"><h2 className="font-bold">Submitted answers</h2><span className="text-sm text-stone-500">Rank: Coming soon</span></div><div className="mt-5 space-y-5">{review.map((question) => { const statusClass = question.status === "correct" ? "text-emerald-600" : question.status === "incorrect" ? "text-rose-600" : "text-amber-600"; const statusLabel = question.status === "correct" ? "Correct" : question.status === "incorrect" ? "Incorrect" : "Unattempted"; return <article className="rounded-xl border border-stone-100 p-4" key={question.question_id}><p className="font-semibold">{question.question_number}. {question.question_text}</p><p className="mt-2 text-sm"><b>Your answer:</b> {question.selected_answer ? `${question.selected_option}. ${question.selected_answer}` : "Not attempted"}</p><p className="mt-1 text-sm"><b>Correct answer:</b> {question.correct_answer ? `${question.correct_option}. ${question.correct_answer}` : "Not available for this earlier submission"}</p><p className={`mt-1 text-sm font-semibold ${statusClass}`}>Status: {statusLabel}</p><p className="mt-3 border-t border-stone-100 pt-3 text-sm leading-6 text-stone-600"><b>Explanation:</b> {question.explanation?.trim() || "Explanation not available"}</p></article>; })}</div></div></section>;
}

export default function Results() {
  return <Suspense fallback={<section className="container-page py-20 text-center"><p className="text-stone-500">Loading submitted result…</p></section>}><ResultsContent /></Suspense>;
}
