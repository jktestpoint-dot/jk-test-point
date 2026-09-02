"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Progress = { testsAttempted: number; averageScore: number; rank: number };

export function HomeProgress() {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => { fetch("/api/dashboard", { cache: "no-store" }).then(async (response) => response.ok ? setProgress((await response.json()).stats) : setProgress(null)).catch(() => setProgress(null)); }, []);
  if (!progress) return <div className="relative card self-center !border-white/20 !bg-white/10 !p-7 backdrop-blur"><p className="text-sm text-brand-100">START YOUR PREPARATION</p><p className="mt-3 text-3xl font-bold">Your preparation starts here.</p><p className="mt-3 text-sm leading-6 text-brand-100">Register or login to start taking tests and track your progress.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/register" className="btn bg-white text-brand-700 hover:bg-brand-50">Register</Link><Link href="/login" className="btn border border-white/30 text-white hover:bg-white/10">Login</Link></div></div>;
  return <div className="relative card self-center !border-white/20 !bg-white/10 !p-7 backdrop-blur"><p className="text-sm text-brand-100">TODAY&apos;S PROGRESS</p><p className="mt-3 text-4xl font-bold">You&apos;re one test closer.</p><div className="mt-7 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-brand-200" style={{ width: `${Math.min(progress.averageScore, 100)}%` }} /></div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div><b className="block text-xl">{progress.averageScore}%</b><span className="text-xs text-brand-100">Accuracy</span></div><div><b className="block text-xl">{progress.testsAttempted}</b><span className="text-xs text-brand-100">Tests done</span></div><div><b className="block text-xl">{progress.rank ? `#${progress.rank}` : "0"}</b><span className="text-xs text-brand-100">Your rank</span></div></div></div>;
}
