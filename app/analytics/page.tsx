"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AttemptType = "mock" | "paid_subject" | "free_subject";
type AnalyticsData = {
  summary: {
    totalAttempts: number;
    averagePercentage: number | null;
    bestPercentage: number | null;
    latestPercentage: number | null;
    attemptCountsByType: Record<AttemptType, number>;
    questionMetricAttemptCount: number;
    totalQuestions: number | null;
    totalCorrect: number | null;
    totalIncorrect: number | null;
    totalUnattempted: number | null;
    recentPercentageTrend: Array<{
      attemptId: string;
      attemptType: AttemptType;
      title: string;
      percentage: number;
      createdAt: string;
    }>;
  };
};

const typeLabels: Record<AttemptType, string> = {
  mock: "Mock Tests",
  paid_subject: "Paid MCQ",
  free_subject: "Free MCQ",
};

function percentage(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString();
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/analytics", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          router.replace("/login?next=/analytics");
          return;
        }
        const body = await response.json().catch(() => ({ error: "Analytics returned an invalid response." })) as {
          data?: AnalyticsData;
          error?: string;
        };
        if (!response.ok || !body.data) {
          setError(body.error || "Unable to load your analytics.");
          return;
        }
        setAnalytics(body.data);
      } catch {
        if (active) setError("Unable to load your analytics. Please refresh to try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [router]);

  const summary = analytics?.summary;
  const trend = summary?.recentPercentageTrend || [];
  const partialQuestionMetrics = Boolean(summary && summary.questionMetricAttemptCount < summary.totalAttempts);

  return <section className="container-page py-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Student performance</p>
        <h1 className="mt-2 text-3xl font-bold">Analytics</h1>
        <p className="mt-2 text-stone-500">Use your completed attempts to understand your progress over time.</p>
      </div>
      <Link href="/dashboard" className="btn-secondary !px-4 !py-2">Back to dashboard</Link>
    </div>

    {loading && <div className="card mt-7 text-center text-sm text-stone-500" role="status">Loading your performance analytics…</div>}
    {!loading && error && <div className="card mt-7 text-center text-sm text-rose-700">{error}</div>}

    {!loading && !error && summary && <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total attempts", String(summary.totalAttempts)],
          ["Average percentage", percentage(summary.averagePercentage)],
          ["Best percentage", percentage(summary.bestPercentage)],
          ["Latest percentage", percentage(summary.latestPercentage)],
        ].map(([label, value]) => <div className="card" key={label}><p className="text-sm text-stone-500">{label}</p><b className="mt-2 block text-3xl text-brand-700">{value}</b></div>)}
      </div>

      {summary.totalAttempts === 0 ? <div className="card mt-7 text-center"><h2 className="text-xl font-bold">No performance data yet</h2><p className="mt-2 text-sm text-stone-500">Complete a mock test or subject practice attempt to start tracking your progress.</p><Link href="/mock-tests" className="btn-primary mt-5">Browse mock tests</Link></div> : <>
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Performance trend</h2><p className="mt-1 text-sm text-stone-500">Your latest attempts, oldest to newest. Percentages are comparable across practice types.</p></div><span className="text-xs text-stone-400">Last {trend.length} attempts</span></div>
            {trend.length === 0 ? <p className="mt-6 text-sm text-stone-500">No completed attempts are available for a trend yet.</p> : <>
              <div className="mt-6 flex h-48 items-end gap-2 overflow-x-auto pb-1 sm:gap-3">
                {trend.map((attempt, index) => <div className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-2" key={`${attempt.attemptType}:${attempt.attemptId}`} title={`${attempt.title}: ${Math.round(attempt.percentage)}% on ${shortDate(attempt.createdAt)}`}><span className="text-xs font-semibold text-brand-700">{Math.round(attempt.percentage)}%</span><div className="min-h-[3px] w-full rounded-t bg-brand-500" style={{ height: `${Math.max(attempt.percentage, 2)}%` }} /><span className="text-xs text-stone-400">T{index + 1}</span></div>)}
              </div>
              <div className="mt-5 space-y-2 border-t border-brand-100 pt-4 text-sm">
                {trend.map((attempt) => <div className="flex flex-wrap justify-between gap-2" key={`detail:${attempt.attemptType}:${attempt.attemptId}`}><span className="text-stone-600">{attempt.title} · {typeLabels[attempt.attemptType]} · {shortDate(attempt.createdAt)}</span><b className="text-brand-700">{Math.round(attempt.percentage)}%</b></div>)}
              </div>
            </>}
          </div>
          <div className="card"><h2 className="font-bold">Attempt breakdown</h2><p className="mt-1 text-sm text-stone-500">Completed attempts by practice type.</p><div className="mt-5 space-y-4">{(["mock", "paid_subject", "free_subject"] as AttemptType[]).map((type) => <div key={type}><div className="flex justify-between text-sm"><span>{typeLabels[type]}</span><b className="text-brand-700">{summary.attemptCountsByType[type]}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500" style={{ width: `${summary.totalAttempts ? (summary.attemptCountsByType[type] / summary.totalAttempts) * 100 : 0}%` }} /></div></div>)}</div></div>
        </div>

        <div className="card mt-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Question performance details</h2><p className="mt-1 text-sm text-stone-500">Available only for attempts with persisted question-level counts.</p></div><span className="text-xs text-stone-400">{summary.questionMetricAttemptCount} of {summary.totalAttempts} attempts covered</span></div>
          {summary.questionMetricAttemptCount === 0 ? <p className="mt-5 text-sm text-stone-500">Question-level details are unavailable for your current attempt history.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Total questions", summary.totalQuestions], ["Correct", summary.totalCorrect], ["Incorrect", summary.totalIncorrect], ["Unattempted", summary.totalUnattempted]].map(([label, value]) => <div className="rounded-xl border border-brand-100 bg-brand-50 p-4" key={String(label)}><p className="text-sm text-stone-500">{label}</p><b className="mt-2 block text-2xl text-brand-700">{value ?? "Unavailable"}</b></div>)}</div>}
          {partialQuestionMetrics && <p className="mt-4 text-sm text-stone-500">Some historical mock attempts do not store question-level counts, so they are not included in these totals.</p>}
        </div>
      </>}
    </>}
  </section>;
}
