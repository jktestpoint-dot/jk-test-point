"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [["Home", "/"], ["Mock Tests", "/mock-tests"], ["Pricing", "/pricing"], ["About", "/about"], ["Contact", "/contact"]] as const;
type Student = { name: string };

export function Header({ freePracticeHref }: { freePracticeHref?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const navigationLinks = freePracticeHref ? [...links.slice(0, 2), ["Free MCQs", freePracticeHref] as const, ...links.slice(2)] : links;

  const loadStudent = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) return setStudent(null);
      const body = await response.json() as { user?: Student };
      setStudent(body.user || null);
    } catch {
      setStudent(null);
    }
  };

  useEffect(() => {
    void loadStudent();
    window.addEventListener("jk-auth-change", loadStudent);
    return () => window.removeEventListener("jk-auth-change", loadStudent);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStudent(null);
    window.dispatchEvent(new Event("jk-auth-change"));
    router.push("/");
    router.refresh();
  };

  const authControls = student ? <>
    <span className="hidden max-w-36 truncate px-2 py-2 text-sm font-semibold text-brand-900 sm:block">{student.name}</span>
    <Link className="btn-secondary !px-4 !py-2" href="/profile">Profile</Link>
    <Link className="btn-secondary !px-4 !py-2" href="/bookmarks">Saved Questions</Link>
    <button className="btn-secondary !px-4 !py-2" onClick={logout}>Logout</button>
  </> : <>
    <Link className="btn-secondary !px-4 !py-2" href="/login">Login</Link>
    <Link className="btn-primary !px-4 !py-2" href="/register">Register</Link>
  </>;

  return <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-white/95 shadow-[0_1px_0_rgba(128,0,0,.04)] backdrop-blur">
    <div className="container-page flex h-[4.5rem] items-center justify-between gap-3">
      <Link href="/" className="flex shrink-0 items-center gap-2.5 font-bold text-brand-900" aria-label="JK Test Point home">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-sm font-extrabold text-white shadow-sm">JK</span>
        <span className="text-[15px] sm:text-base">JK Test Point</span>
      </Link>
      <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Primary navigation">
        {navigationLinks.map(([name, href]) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);
          return <Link className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-brand-50 text-brand-700" : "text-stone-600 hover:bg-brand-50 hover:text-brand-700"}`} href={href} key={href}>{name}</Link>;
        })}
      </nav>
      <div className="hidden items-center gap-2 sm:flex">{authControls}</div>
      <button className="grid h-10 w-10 place-items-center rounded-xl border border-brand-100 text-brand-800 transition hover:bg-brand-50 lg:hidden" aria-label="Toggle navigation menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="text-lg leading-none">{open ? "×" : "☰"}</span>
      </button>
    </div>
    {open && <div className="border-t border-brand-100 bg-white lg:hidden"><nav className="container-page py-3" aria-label="Mobile navigation">{navigationLinks.map(([name, href]) => {
      const active = href === "/" ? pathname === href : pathname.startsWith(href);
      return <Link className={`block rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-brand-50 text-brand-700" : "text-stone-700 hover:bg-brand-50"}`} href={href} key={href}>{name}</Link>;
    })}<div className="mt-3 flex flex-wrap gap-2 border-t border-brand-100 pt-3">{authControls}</div></nav></div>}
  </header>;
}
