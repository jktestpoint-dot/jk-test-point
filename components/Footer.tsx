import Link from "next/link";

export function Footer({ freePracticeHref }: { freePracticeHref?: string | null }) {
  return <footer className="mt-16 border-t border-brand-800 bg-brand-900 text-brand-100">
    <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="max-w-sm"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-xs font-extrabold text-brand-700">JK</span><p className="text-xl font-bold text-white">JK Test Point</p></div><p className="mt-4 text-sm leading-6">Your Gateway to Better Preparation. Built for ambitious aspirants.</p></div>
      <div><p className="font-semibold text-white">Practice</p><Link className="mt-4 block text-sm transition hover:translate-x-px hover:text-white" href="/mock-tests">Mock Tests</Link>{freePracticeHref && <Link className="mt-3 block text-sm transition hover:translate-x-px hover:text-white" href={freePracticeHref}>Free MCQ Practice</Link>}<Link className="mt-3 block text-sm transition hover:translate-x-px hover:text-white" href="/pricing">Plans & Pricing</Link></div>
      <div><p className="font-semibold text-white">Company</p><Link className="mt-4 block text-sm transition hover:translate-x-px hover:text-white" href="/about">About us</Link><Link className="mt-3 block text-sm transition hover:translate-x-px hover:text-white" href="/contact">Contact us</Link></div>
      <div><p className="font-semibold text-white">Legal</p><Link className="mt-4 block text-sm transition hover:translate-x-px hover:text-white" href="/privacy">Privacy Policy</Link><Link className="mt-3 block text-sm transition hover:translate-x-px hover:text-white" href="/terms">Terms & Conditions</Link></div>
    </div>
    <div className="container-page border-t border-white/10 py-5 text-center text-xs text-brand-200">© {new Date().getFullYear()} JK Test Point. All rights reserved.</div>
  </footer>;
}
