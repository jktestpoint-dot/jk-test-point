import Link from "next/link";
import type { Metadata } from "next";
import { HomeProgress } from "@/components/HomeProgress";
import { getFeaturedMockTests } from "@/lib/featured-tests";
import { slugify } from "@/components/MockTestCategoryBrowser";

export const metadata: Metadata = {
  title: "JK Test Point | Better Preparation",
  description: "Practice free MCQs and browse mock tests for JKSSB and other Jammu & Kashmir competitive exams.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "JK Test Point | Better Preparation",
    description: "Practice free MCQs and browse mock tests for JKSSB and other Jammu & Kashmir competitive exams.",
    url: "/",
    type: "website",
  },
  twitter: { card: "summary", title: "JK Test Point | Better Preparation", description: "Practice free MCQs and browse mock tests for JKSSB and other Jammu & Kashmir competitive exams." },
};

const features = [
  ["Free MCQs", "Start with selected practice questions at no cost."],
  ["Mock Tests", "Build exam confidence with focused, timed practice."],
  ["Detailed results", "Review your answers and understand each attempt."],
  ["Performance tracking", "Use your dashboard and analytics to follow progress."],
];
const categories = ["JKSSB", "Banking", "Kashmir University", "High Court"];
export default async function Home() {
  const featuredTests = await getFeaturedMockTests().catch(() => []);

  return <>
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
      <div className="pointer-events-none absolute -left-32 top-8 h-72 w-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="container-page relative grid gap-8 py-12 sm:gap-10 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div className="self-center"><p className="eyebrow !text-brand-200">Your Gateway to Better Preparation</p><h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">Prepare Smarter.<br />Score Better.</h1><p className="mt-5 max-w-xl text-base leading-7 text-brand-100 sm:text-lg sm:leading-8">Build confidence with focused MCQ practice, mock tests and clear feedback for JK aspirants.</p><div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row"><Link href="/free-mcq-practice" className="btn min-h-12 bg-white text-brand-700 hover:bg-brand-50">Start Free Practice</Link><Link href="/mock-tests" className="btn min-h-12 border border-white/30 text-white hover:bg-white/10">Browse Mock Tests</Link></div><div className="mt-8 border-t border-white/15 pt-5 sm:mt-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Explore by exam</p><div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <Link href={`/mock-tests/category/${slugify(category)}`} className="rounded-full border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40" key={category}>{category}</Link>)}</div></div></div>
        <div className="relative lg:pl-8"><div className="absolute -inset-5 rounded-[2rem] border border-white/10" /><HomeProgress /></div>
      </div>
    </section>
    <section className="container-page -mt-5 relative z-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-brand-100 bg-brand-100 text-center shadow-card sm:-mt-7 sm:grid-cols-4">{[["6,590+", "Questions"], ["11+", "Mock Tests"], ["Free", "Practice"], ["24/7", "Access"]].map(([number, label]) => <div className="bg-white px-3 py-5 sm:py-6" key={label}><b className="block text-2xl text-brand-700 sm:text-3xl">{number}</b><span className="text-xs text-stone-500 sm:text-sm">{label}</span></div>)}</section>
    <section className="container-page section-space"><div className="grid gap-6 xl:grid-cols-2"><div className="card overflow-hidden border-brand-100 bg-white sm:p-10"><div className="text-center"><p className="eyebrow">Subject-wise preparation</p><h2 className="mt-2 text-3xl font-bold">Paid MCQ Practice</h2><p className="mx-auto mt-3 max-w-md text-stone-600">Question banks aligned with relevant SSC, JKSSB and competitive-exam preparation.</p><Link href="/mcq-practice" className="btn-primary mt-6 inline-flex">Browse Paid Subjects</Link></div></div><div className="card overflow-hidden border-brand-100 bg-white sm:p-10"><div className="text-center"><p className="eyebrow">No purchase required</p><h2 className="mt-2 text-3xl font-bold">Free MCQ Practice</h2><p className="mx-auto mt-3 max-w-md text-stone-600">Start with selected free question sets and see your results after every attempt.</p><Link href="/free-mcq-practice" className="btn-primary mt-6 inline-flex">Browse Free Subjects</Link></div></div></div></section>
    <section id="featured" className="container-page section-space"><div className="flex items-end justify-between gap-5"><div className="section-heading"><p className="eyebrow">Practice with purpose</p><h2>Featured mock tests</h2></div><Link href="/mock-tests" className="shrink-0 text-sm font-bold text-brand-600">View all →</Link></div><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{featuredTests.map((test) => <article className="card card-lift flex h-full flex-col" key={test.id}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{test.main_category}</span><div className="flex items-center gap-2">{test.question_count === 0 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">Coming Soon</span>}<span className="text-sm font-semibold text-stone-500">{test.price ? `₹${test.price}` : "Free"}</span></div></div><h3 className="mt-5 text-lg font-bold">{test.title}</h3><p className="mt-2 text-sm text-stone-500">{test.question_count} questions · {test.duration_minutes} mins · {test.subcategory}</p><Link href={`/mock-tests/${test.id}`} className="btn-primary mt-6 w-full">View test</Link></article>)}{!featuredTests.length && <div className="card text-sm text-stone-500 md:col-span-2 xl:col-span-3">No featured mock tests have been selected yet.</div>}</div></section>
    <section className="border-y border-brand-100 bg-white section-space"><div className="container-page"><div className="section-heading"><p className="eyebrow">Why JK Test Point</p><h2>Everything you need to improve</h2></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{features.map(([title, text], index) => <div className="card card-lift" key={title}><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-bold text-brand-600">0{index + 1}</span><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-500">{text}</p></div>)}</div></div></section>
    <section className="container-page section-space"><div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]"><div><div className="section-heading"><p className="eyebrow">Help before you begin</p><h2>Clear answers for confident practice</h2></div><div className="mt-6 space-y-3">{[
      ["Can I practise before purchasing anything?", "Yes. Open Free MCQ Practice to see subjects with active free questions and start without a purchase."],
      ["How do mock-test results work?", "Submit a completed attempt to view the existing result and review flow, including the answers recorded for that attempt."],
      ["Where can I track my progress?", "Signed-in students can use the dashboard, analytics and attempt history to review completed activity."],
      ["What does Coming Soon mean?", "It means the subject or test is listed but does not currently have questions available for practice."],
    ].map(([question, answer]) => <details className="group rounded-2xl border border-stone-200 bg-white p-5 open:border-brand-200" key={question}><summary className="cursor-pointer list-none pr-8 font-semibold text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30">{question}<span className="float-right text-brand-600 transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-3 text-sm leading-6 text-stone-600">{answer}</p></details>)}</div></div><aside className="card h-fit border-brand-100 bg-brand-50 sm:p-7"><p className="eyebrow">Trust & support</p><h2 className="mt-2 text-2xl font-bold">Know how the platform works</h2><p className="mt-3 text-sm leading-6 text-stone-600">Review the platform policies or contact the team if you need help with an account, practice access or payment.</p><div className="mt-6 grid gap-3"><Link className="btn-primary w-full" href="/contact">Contact support</Link><Link className="btn-secondary w-full" href="/privacy">Privacy policy</Link><Link className="btn-secondary w-full" href="/terms">Terms & conditions</Link></div></aside></div></section>
  </>;
}
