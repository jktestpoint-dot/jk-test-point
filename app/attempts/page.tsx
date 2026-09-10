"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AttemptType = "mock" | "paid_subject" | "free_subject";
type HistoryAttempt = {
  attemptId: string;
  attemptType: AttemptType;
  title: string;
  subject: string | null;
  score: number;
  percentage: number;
  totalQuestions: number | null;
  totalMarks: number | null;
  correct: number | null;
  incorrect: number | null;
  unattempted: number | null;
  createdAt: string;
  resultUrl: string;
};

const filters: Array<{ id: "all" | AttemptType; label: string }> = [
  { id: "all", label: "All attempts" },
  { id: "mock", label: "Mock tests" },
  { id: "paid_subject", label: "Paid MCQ practice" },
  { id: "free_subject", label: "Free MCQ practice" },
];

const attemptLabels: Record<AttemptType, string> = {
  mock: "Mock test",
  paid_subject: "Paid MCQ practice",
  free_subject: "Free MCQ practice",
};

function attemptDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function AttemptsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<HistoryAttempt[]>([]);
  const [filter, setFilter] = useState<"all" | AttemptType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/attempt-history", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          router.replace("/login?next=/attempts");
          return;
        }
        const body = await response.json().catch(() => ({ error: "Attempt history returned an invalid response." })) as {
          data?: HistoryAttempt[];
          error?: string;
        };
        if (!response.ok || !Array.isArray(body.data)) {
          setError(body.error || "Unable to load your attempt history.");
          return;
        }
        setAttempts(body.data);
      } catch {
        if (active) setError("Unable to load your attempt history. Please refresh to try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [router]);

  const visibleAttempts = useMemo(
    () => filter === "all" ? attempts : attempts.filter((attempt) => attempt.attemptType === filter),
    [attempts, filter],
  );

  return <section className="container-page py-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Student history</p>
        <h1 className="mt-2 text-3xl font-bold">My attempts</h1>
        <p className="mt-2 text-stone-500">Review every mock test and subject practice attempt in one place.</p>
      </div>
      <Link href="/dashboard" className="btn-secondary !px-4 !py-2">Back to dashboard</Link>
    </div>

    <div className="mt-7 flex flex-wrap gap-2" aria-label="Attempt type filters">
      {filters.map((item) => <button
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === item.id ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}
        key={item.id}
        onClick={() => setFilter(item.id)}
      >{item.label}</button>)}
    </div>

    {loading && <div className="card mt-6 text-center text-sm text-stone-500" role="status">Loading your attempt history…</div>}
    {!loading && error && <div className="card mt-6 text-center text-sm text-rose-700">{error}</div>}
    {!loading && !error && attempts.length === 0 && <div className="card mt-6 text-center"><h2 className="text-xl font-bold">No attempts yet</h2><p className="mt-2 text-sm text-stone-500">Complete a mock test or subject practice set to see it here.</p><Link href="/mock-tests" className="btn-primary mt-5">Browse mock tests</Link></div>}
    {!loading && !error && attempts.length > 0 && visibleAttempts.length === 0 && <div className="card mt-6 text-center text-sm text-stone-500">No attempts match this filter.</div>}

    {!loading && !error && visibleAttempts.length > 0 && <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {visibleAttempts.map((attempt) => <article className="card" key={`${attempt.attemptType}:${attempt.attemptId}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{attemptLabels[attempt.attemptType]}</span>
            <h2 className="mt-3 text-lg font-bold">{attempt.title}</h2>
            <p className="mt-1 text-sm text-stone-500">{attemptDate(attempt.createdAt)}</p>
          </div>
          <div className="text-right"><p className="text-sm text-stone-500">Score</p><b className="text-2xl text-brand-700">{attempt.score}{attempt.totalMarks === null ? "" : `/${attempt.totalMarks}`}</b><p className="text-sm font-semibold text-emerald-600">{Math.round(attempt.percentage)}%</p></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {attempt.totalQuestions !== null && <div className="rounded-lg bg-brand-50 p-3"><p className="text-stone-500">Questions</p><b>{attempt.totalQuestions}</b></div>}
          {attempt.correct !== null && <div className="rounded-lg bg-emerald-50 p-3"><p className="text-stone-500">Correct</p><b>{attempt.correct}</b></div>}
          {attempt.incorrect !== null && <div className="rounded-lg bg-rose-50 p-3"><p className="text-stone-500">Incorrect</p><b>{attempt.incorrect}</b></div>}
          {attempt.unattempted !== null && <div className="rounded-lg bg-amber-50 p-3"><p className="text-stone-500">Unattempted</p><b>{attempt.unattempted}</b></div>}
        </div>
        <Link href={attempt.resultUrl} className="btn-primary mt-5 w-full">View result</Link>
      </article>)}
    </div>}
  </section>;
}
