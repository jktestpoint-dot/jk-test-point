"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Attempt = { id: string; test_title: string | null; percentage: number; created_at: string };
type PurchasedTest = { id: string; title: string; questionCount: number; href: string };
type DashboardData = {
  user: { name: string };
  stats: { testsAttempted: number; averageScore: number; bestScore: number; currentStreak: number };
  attempts: Attempt[];
  purchasedTests: PurchasedTest[];
};

export default function Dashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) { router.replace("/login"); return; }
        const result = await response.json().catch(() => ({ error: "Dashboard returned an invalid response." }));
        if (!active) return;
        if (!response.ok) { setError(result.error || "Unable to load your dashboard."); return; }
        setDashboard(result);
      } catch {
        if (active) setError("Unable to load your dashboard. Please refresh to try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDashboard();
    window.addEventListener("jk-auth-change", loadDashboard);
    return () => { active = false; window.removeEventListener("jk-auth-change", loadDashboard); };
  }, [router]);

  const stats = dashboard?.stats || { testsAttempted: 0, averageScore: 0, bestScore: 0, currentStreak: 0 };
  const attempts = dashboard?.attempts || [];
  const purchasedTests = dashboard?.purchasedTests || [];
  const trend = attempts.slice(0, 7).reverse();

  return <section className="container-page py-10">
    <p className="eyebrow">Student dashboard</p>
    <h1 className="mt-2 text-3xl font-bold">Welcome back{dashboard ? `, ${dashboard.user.name}` : ""}!</h1>
    <p className="mt-2 text-stone-500">Keep your momentum going — your next goal is within reach.</p>
    {error&&<p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Tests attempted",String(stats.testsAttempted)],["Average score",`${stats.averageScore}%`],["Best score",`${stats.bestScore}%`],["Current streak",`${stats.currentStreak} days`]].map(([l,n])=><div className="card" key={l}><p className="text-sm text-stone-500">{l}</p><b className="mt-2 block text-3xl text-brand-700">{n}</b></div>)}</div>
    <div className="card mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold">My Purchased Tests</h2><p className="mt-1 text-sm text-stone-500">Start the subject tests unlocked on your account.</p></div>
        {purchasedTests.length>0&&<Link className="text-sm font-semibold text-brand-700 hover:text-brand-800" href="/mock-tests">Browse mock tests</Link>}
      </div>
      {loading?<p className="mt-5 text-sm text-stone-500" role="status">Loading your purchased tests…</p>:error||!dashboard?<p className="mt-5 text-sm text-stone-500">Purchased tests could not be loaded. Please refresh to try again.</p>:purchasedTests.length?<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{purchasedTests.map((test)=><div className="rounded-xl border border-brand-100 bg-brand-50 p-4" key={test.id}><h3 className="font-semibold">{test.title}</h3><p className="mt-1 text-sm text-stone-500">{test.questionCount} MCQs</p><Link className="btn-primary mt-4 w-full" href={test.href}>Start Test</Link></div>)}</div>:<div className="mt-5 rounded-xl border border-dashed border-brand-200 bg-brand-50 p-5"><p className="text-sm text-stone-600">You have no purchased tests yet.</p><Link className="btn-primary mt-4" href="/mock-tests">Browse available mock tests</Link></div>}
    </div>
    <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr]"><div className="card"><h2 className="font-bold">Performance trend</h2>{trend.length?<div className="mt-6 flex h-44 items-end justify-between gap-3">{trend.map((attempt,index)=><div className="flex flex-1 flex-col items-center gap-2" key={attempt.id}><div className="w-full rounded-t bg-brand-500" style={{height:`${Math.max(attempt.percentage,2)}%`}}/><span className="text-xs text-stone-400">T{index+1}</span></div>)}</div>:<p className="mt-6 text-sm text-stone-500">No attempt data yet. Complete a test to see your progress.</p>}</div><div className="card"><h2 className="font-bold">Recent tests</h2>{attempts.length?<div className="mt-4 space-y-4 text-sm">{attempts.slice(0,3).map((attempt)=><div className="flex justify-between" key={attempt.id}><span>{attempt.test_title||"Mock test"}</span><b className="text-emerald-600">{Math.round(attempt.percentage)}%</b></div>)}</div>:<p className="mt-4 text-sm text-stone-500">No completed tests yet.</p>}<Link className="btn-primary mt-6 w-full" href="/mock-tests">Take a new test</Link></div></div>
    <div className="card mt-6"><h2 className="font-bold">Profile & purchases</h2><p className="mt-2 text-sm text-stone-500">Your account preferences and payment history will appear here after secure authentication is connected.</p></div>
  </section>;
}
