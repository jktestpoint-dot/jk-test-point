"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LeaderboardEntry = {
  rank: number;
  displayName: string;
  percentage: number;
  score: number;
  testTitle: string;
};

type LeaderboardResponse = { data?: LeaderboardEntry[]; error?: string };

function rankClass(rank: number) {
  if (rank === 1) return "border-amber-200 bg-amber-50 text-amber-800";
  if (rank === 2) return "border-stone-200 bg-stone-100 text-stone-700";
  if (rank === 3) return "border-orange-200 bg-orange-50 text-orange-800";
  return "border-brand-100 bg-brand-50 text-brand-700";
}

export function TestLeaderboard({ testId, testTitle }: { testId: string; testTitle: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [title, setTitle] = useState(testTitle);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/leaderboard/${encodeURIComponent(testId)}`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) as LeaderboardResponse }))
      .then(({ response, body }) => {
        if (response.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/mock-tests/${testId}/leaderboard`)}`);
          return;
        }
        if (!response.ok) throw new Error(body.error || "Unable to load this leaderboard.");
        const data = Array.isArray(body.data) ? body.data : [];
        if (!active) return;
        setEntries(data);
        setTitle(data[0]?.testTitle || testTitle);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load this leaderboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router, testId, testTitle]);

  if (loading) {
    return <section className="container-page section-space"><div className="card text-center text-stone-500">Loading leaderboard…</div></section>;
  }

  if (error) {
    return <section className="container-page section-space"><div className="card text-center"><h1 className="text-xl font-bold">Leaderboard unavailable</h1><p className="mt-2 text-sm text-rose-700">{error}</p><Link className="btn-secondary mt-5" href={`/mock-tests/${testId}`}>Back to test</Link></div></section>;
  }

  return <section className="container-page section-space">
    <div className="mx-auto max-w-4xl">
      <div className="page-intro">
        <p className="eyebrow">Mock test leaderboard</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Leaderboard</h1>
        <p className="mt-3 text-stone-600">{title || "See the best completed attempts for this mock test."}</p>
      </div>

      {!entries.length ? <div className="card mt-7 text-center"><h2 className="text-xl font-bold">No leaderboard entries yet</h2><p className="mt-2 text-sm text-stone-600">Complete this published test to become the first student on its leaderboard.</p><Link className="btn-secondary mt-5" href={`/mock-tests/${testId}`}>Back to test</Link></div> : <div className="card mt-7 overflow-hidden p-0">
        <div className="hidden grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-stone-100 bg-stone-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-stone-500 sm:grid">
          <span>Rank</span><span>Student</span><span>Score</span><span>Percentage</span>
        </div>
        <div className="divide-y divide-stone-100">
          {entries.map((entry) => <article className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-4" key={`${entry.rank}-${entry.displayName}`}>
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${rankClass(entry.rank)}`}>{entry.rank}</span>
            <div><p className="font-semibold text-stone-800">{entry.displayName}</p><p className="mt-1 text-sm text-stone-500 sm:hidden">Score: {entry.score} · {entry.percentage}%</p></div>
            <p className="hidden text-right text-sm font-semibold text-stone-700 sm:block">{entry.score}</p>
            <p className="hidden min-w-20 text-right text-sm font-bold text-brand-700 sm:block">{entry.percentage}%</p>
          </article>)}
        </div>
      </div>}
    </div>
  </section>;
}
