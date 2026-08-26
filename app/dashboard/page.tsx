"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Attempt = { id: string; test_title: string | null; percentage: number; created_at: string };
type DashboardData = { user: { name: string }; stats: { testsAttempted: number; averageScore: number; bestScore: number; currentStreak: number }; attempts: Attempt[] };

export default function Dashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const loadDashboard = async () => {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.status === 401) { router.replace("/login"); return; }
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to load your dashboard."); return; }
      setDashboard(result);
    };
    loadDashboard();
    window.addEventListener("jk-auth-change", loadDashboard);
    return () => window.removeEventListener("jk-auth-change", loadDashboard);
  }, [router]);
  const stats = dashboard?.stats || { testsAttempted: 0, averageScore: 0, bestScore: 0, currentStreak: 0 };
  const attempts = dashboard?.attempts || [];
  const trend = attempts.slice(0, 7).reverse();
  return <section className="container-page py-10"><p className="eyebrow">Student dashboard</p><h1 className="mt-2 text-3xl font-bold">Welcome back{dashboard ? `, ${dashboard.user.name}` : ""}!</h1><p className="mt-2 text-slate-500">Keep your momentum going — your next goal is within reach.</p>{error&&<p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Tests attempted",String(stats.testsAttempted)],["Average score",`${stats.averageScore}%`],["Best score",`${stats.bestScore}%`],["Current streak",`${stats.currentStreak} days`]].map(([l,n])=><div className="card" key={l}><p className="text-sm text-slate-500">{l}</p><b className="mt-2 block text-3xl text-brand-700">{n}</b></div>)}</div><div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr]"><div className="card"><h2 className="font-bold">Performance trend</h2>{trend.length?<div className="mt-6 flex h-44 items-end justify-between gap-3">{trend.map((attempt,index)=><div className="flex flex-1 flex-col items-center gap-2" key={attempt.id}><div className="w-full rounded-t bg-brand-500" style={{height:`${Math.max(attempt.percentage,2)}%`}}/><span className="text-xs text-slate-400">T{index+1}</span></div>)}</div>:<p className="mt-6 text-sm text-slate-500">No attempt data yet. Complete a test to see your progress.</p>}</div><div className="card"><h2 className="font-bold">Recent tests</h2>{attempts.length?<div className="mt-4 space-y-4 text-sm">{attempts.slice(0,3).map((attempt)=><div className="flex justify-between" key={attempt.id}><span>{attempt.test_title || "Mock test"}</span><b className="text-emerald-600">{Math.round(attempt.percentage)}%</b></div>)}</div>:<p className="mt-4 text-sm text-slate-500">No completed tests yet.</p>}<Link className="btn-primary mt-6 w-full" href="/mock-tests">Take a new test</Link></div></div><div className="card mt-6"><h2 className="font-bold">Profile & purchases</h2><p className="mt-2 text-sm text-slate-500">Your account preferences and payment history will appear here after secure authentication is connected.</p></div></section>;
}
