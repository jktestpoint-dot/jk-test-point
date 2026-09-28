"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentIllustration } from "@/components/StudentIllustration";
import { BookmarkToggle } from "@/components/BookmarkToggle";
import type { CatalogTest, PublicTestQuestion } from "@/lib/mock-test-types";

type AttemptResult = {
  attempt_id?: string;
  score?: number;
  total_marks?: number;
  correct?: number;
  incorrect?: number;
  unattempted?: number;
  question_count?: number;
  review?: unknown[];
};

export function TestRunner({ testId }: { testId: string }) {
  const router = useRouter();
  const [test, setTest] = useState<CatalogTest | null>(null);
  const [questions, setQuestions] = useState<PublicTestQuestion[]>([]);
  const [loadError, setLoadError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [marked, setMarked] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadTest() {
      const testResponse = await fetch(`/api/tests/${encodeURIComponent(testId)}`, { cache: "no-store" });
      const testBody = (await testResponse.json()) as { data?: CatalogTest; error?: string };
      if (!testResponse.ok || !testBody.data) throw new Error(testBody.error || "Unable to load this mock test.");

      const questionsResponse = await fetch(`/api/tests/${encodeURIComponent(testId)}/questions`, { cache: "no-store" });
      const questionsBody = (await questionsResponse.json()) as { data?: PublicTestQuestion[]; error?: string };
      if (!questionsResponse.ok || !questionsBody.data) throw new Error(questionsBody.error || "Unable to load test questions.");

      return { test: testBody.data, questions: questionsBody.data };
    }

    loadTest().then((data) => {
      if (!active) return;
      const actualQuestionCount = data.questions.length;
      setTest(data.test);
      setQuestions(data.questions);
      setAnswers(Array(actualQuestionCount));
      setSeconds(actualQuestionCount * 60);
    }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : "Unable to load this mock test.");
    });

    return () => { active = false; };
  }, [testId]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!questions.length) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [current, questions.length]);

  const actualQuestionCount = questions.length;

  const finish = useCallback(async (fromLeave = false) => {
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;
    if (fromLeave) allowLeaveRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          answers: questions.map((question, index) => ({
            question_id: question.id,
            selected_option: answers[index] === undefined ? null : String.fromCharCode(65 + (answers[index] as number)),
          })),
        }),
      });
      const result = (await response.json()) as { data?: AttemptResult; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save your test attempt.");

      sessionStorage.setItem("jk-result", JSON.stringify({
        answers,
        ...result.data,
        time: actualQuestionCount * 60 - seconds,
        questions,
        totalQuestions: actualQuestionCount,
        totalMarks: result.data?.total_marks ?? actualQuestionCount,
      }));
      const attemptId = result.data?.attempt_id;
      router.push(`/results?test=${encodeURIComponent(testId)}${attemptId ? `&attempt=${encodeURIComponent(attemptId)}` : ""}`);
    } catch (error) {
      submittedRef.current = false;
      allowLeaveRef.current = false;
      if (fromLeave) setLeaveConfirm(true);
      setSubmitError(error instanceof Error ? error.message : "Unable to save your test attempt.");
      setSubmitting(false);
    }
  }, [answers, actualQuestionCount, questions, router, seconds, submitting, testId]);

  useEffect(() => {
    if (!questions.length || seconds !== 0 || submitting || submittedRef.current) return;
    void finish();
  }, [finish, questions.length, seconds, submitting]);

  useEffect(() => {
    if (!questions.length) return;

    const guardState = { ...(window.history.state || {}), jkAttemptGuard: true };
    window.history.pushState(guardState, "", window.location.href);
    const handlePopState = () => {
      if (allowLeaveRef.current) return;
      window.history.pushState(guardState, "", window.location.href);
      setLeaveConfirm(true);
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [questions.length]);

  if (loadError) return <section className="container-page py-10"><div className="card text-center text-rose-700">{loadError}</div></section>;
  if (!test) return <section className="container-page py-10"><div className="card text-center text-stone-500">Loading mock test…</div></section>;
  if (!actualQuestionCount) return <section className="container-page py-10"><div className="card text-center text-stone-600"><h1 className="text-xl font-bold">This test is not ready yet. Questions are still being added.</h1><p className="mt-2 text-sm">No questions have been imported for this test.</p></div></section>;

  const questionText = questions[current].text.replace(/\s+(?=\d+\.\s)/g, "\n");
  const q = {
    ...questions[current],
    text: <span className="block min-w-0 max-w-full whitespace-pre-line break-words [overflow-wrap:anywhere]">{questionText}</span>,
  };
  const answeredCount = answers.filter((answer) => answer !== undefined).length;
  return <section className="container-page py-4 sm:py-6">
    <div className="sticky top-[4.5rem] z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      <div className="min-w-0 basis-full sm:basis-auto"><p className="text-xs text-stone-500 sm:text-sm">Practice mode · {answeredCount}/{actualQuestionCount} answered</p><h1 className="truncate font-bold">{test.title}</h1></div>
      <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-3"><StudentIllustration compact className="hidden md:block"/><div aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`} className="rounded-xl bg-brand-900 px-3 py-2 font-mono text-sm font-bold text-white sm:px-4 sm:text-base">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div><button className="btn-primary !px-3 !py-2 sm:!px-5" onClick={() => setConfirm(true)}>Submit Test</button></div>
    </div>
    <div className="mb-5 h-2 overflow-hidden rounded-full bg-brand-50" role="progressbar" aria-label="Question progress" aria-valuemin={1} aria-valuemax={actualQuestionCount} aria-valuenow={current + 1}><div className="h-full bg-brand-600 transition-[width]" style={{ width: `${((current + 1) / actualQuestionCount) * 100}%` }} /></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6"><article className="card min-w-0 !p-4 sm:!p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-brand-600">QUESTION {current + 1} OF {actualQuestionCount}</p><BookmarkToggle sourceType="mock" sourceKey={testId} questionNumber={questions[current].question_number} /></div><h2 className="mt-5 text-lg font-semibold leading-7 sm:text-xl sm:leading-8">{q.text}</h2><div className="mt-6 flex flex-col gap-3">{q.options.map((option, index) => <button key={`${questions[current].id}-${index}`} aria-pressed={answers[current] === index} onClick={() => setAnswers((currentAnswers) => { const nextAnswers = [...currentAnswers]; nextAnswers[current] = index; return nextAnswers; })} className={`block min-h-12 min-w-0 w-full whitespace-normal break-words rounded-xl border p-4 text-left transition ${answers[current] === index ? "border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-600/10" : "border-stone-200 hover:border-brand-300"}`}><b className="mr-3 text-brand-600">{String.fromCharCode(65 + index)}.</b>{option}</button>)}</div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3"><button className="btn-secondary w-full !px-3" disabled={!current} onClick={() => setCurrent(current - 1)}>← Previous</button><button className={`btn-secondary order-last col-span-2 w-full !px-3 sm:order-none sm:col-span-1 ${marked.includes(current) ? "!bg-amber-50 !text-amber-700" : ""}`} aria-pressed={marked.includes(current)} onClick={() => setMarked((markedQuestions) => markedQuestions.includes(current) ? markedQuestions.filter((index) => index !== current) : [...markedQuestions, current])}>{marked.includes(current) ? "Unmark review" : "Mark for Review"}</button><button className="btn-primary w-full !px-3" disabled={current === actualQuestionCount - 1} onClick={() => setCurrent(current + 1)}>Next →</button></div></article><aside className="card h-fit lg:sticky lg:top-4"><h2 className="font-bold">Question palette</h2><p className="mt-2 text-sm text-stone-500">Answered {answeredCount} of {actualQuestionCount}</p><div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">{questions.map((question, index) => <button onClick={() => setCurrent(index)} aria-label={`Question ${index + 1}${answers[index] !== undefined ? ", answered" : marked.includes(index) ? ", marked for review" : ""}`} aria-current={index === current ? "step" : undefined} key={question.id} className={`min-h-10 rounded-lg text-sm font-bold ${index === current ? "bg-brand-600 text-white" : answers[index] !== undefined ? "bg-emerald-100 text-emerald-700" : marked.includes(index) ? "bg-amber-100 text-amber-700" : "bg-stone-100"}`}>{question.question_number}</button>)}</div><div className="mt-5 text-xs leading-6 text-stone-500"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" /> Answered <span className="ml-2 mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> Review</div></aside></div>
    {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/50 p-4"><div className="card w-full max-w-md"><h2 className="text-xl font-bold">Submit your test?</h2><p className="mt-2 text-sm text-stone-500">You have answered {answeredCount} of {actualQuestionCount} questions. This cannot be undone.</p>{submitError && <p className="mt-3 text-sm text-rose-600">{submitError}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="btn-secondary" disabled={submitting} onClick={() => setConfirm(false)}>Keep attempting</button><button className="btn-primary" disabled={submitting} onClick={() => finish()}>{submitting ? "Saving..." : "Submit test"}</button></div></div></div>}
    {leaveConfirm && <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/50 p-4"><div className="card w-full max-w-md"><h2 className="text-xl font-bold">Leave this test?</h2><p className="mt-2 text-sm text-stone-500">Are you sure you want to leave the test? Your current attempt will be submitted.</p>{submitError && <p className="mt-3 text-sm text-rose-600">{submitError}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="btn-secondary" disabled={submitting} onClick={() => setLeaveConfirm(false)}>Cancel</button><button className="btn-primary" disabled={submitting} onClick={() => finish(true)}>{submitting ? "Submitting..." : "Submit Test"}</button></div></div></div>}
  </section>;
}
