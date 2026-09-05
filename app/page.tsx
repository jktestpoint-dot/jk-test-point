import Link from "next/link";
import { HomeProgress } from "@/components/HomeProgress";
import { getFeaturedMockTests } from "@/lib/featured-tests";

const features = [
  ["Targeted practice", "Questions shaped around JKSSB, JKPSC and wider government exams."],
  ["Instant insights", "Review every answer and track the trends that move your score."],
  ["Study anywhere", "A clean, quick experience made for mobile practice sessions."],
];
const categories = ["JKSSB", "Banking", "Kashmir University", "High Court"];
const mcqPracticeSubjects = [
  { id: "accountancy", name: "Accountancy", mcqCount: 500, price: 49 },
  { id: "mathematics", name: "Mathematics", mcqCount: 250, price: 49 },
  { id: "statistics", name: "Statistics", mcqCount: 250, price: 49 },
  { id: "economics", name: "Economics", mcqCount: 250, price: 49 },
];

export default async function Home() {
  const featuredTests = await getFeaturedMockTests().catch(() => []);

  return <>
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
      <div className="pointer-events-none absolute -left-32 top-8 h-72 w-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="container-page relative grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div className="self-center"><p className="eyebrow !text-brand-200">Your Gateway to Better Preparation</p><h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">Prepare Smarter.<br />Score Better.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-brand-100">Practice with high-quality mock tests designed for JK aspirants. Get exam-ready with every attempt.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/mock-tests" className="btn bg-white text-brand-700 hover:bg-brand-50">Start Mock Test</Link><Link href="#featured" className="btn border border-white/30 text-white hover:bg-white/10">Explore Tests</Link></div><div className="mt-10 border-t border-white/15 pt-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Explore by exam</p><div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <Link href="/mock-tests" className="rounded-full border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10" key={category}>{category}</Link>)}</div></div></div>
        <div className="relative lg:pl-8"><div className="absolute -inset-5 rounded-[2rem] border border-white/10" /><HomeProgress /></div>
      </div>
    </section>
    <section className="container-page -mt-5 relative z-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-brand-100 bg-brand-100 text-center shadow-card sm:-mt-7">{[["10,000+", "Questions"], ["500+", "Mock Tests"], ["10,000+", "Students"]].map(([number, label]) => <div className="bg-white px-3 py-5 sm:py-6" key={label}><b className="block text-2xl text-brand-700 sm:text-3xl">{number}</b><span className="text-xs text-stone-500 sm:text-sm">{label}</span></div>)}</section>
    <section className="container-page section-space"><div className="card overflow-hidden bg-brand-50 sm:p-10"><div className="text-center"><p className="eyebrow">Subject-wise preparation</p><h2 className="mt-2 text-3xl font-bold">MCQ Practice</h2><p className="mx-auto mt-3 max-w-2xl text-stone-600">Practice subject-wise MCQs and improve your preparation.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{mcqPracticeSubjects.map((subject) => <article className="card-lift rounded-xl border border-brand-100 bg-white p-5 text-left" key={subject.id}><h3 className="font-bold text-stone-800">{subject.name}</h3><p className="mt-3 text-sm text-stone-500">{subject.mcqCount} MCQs</p><p className="mt-1 text-lg font-bold text-brand-700">₹{subject.price}</p><p className="text-xs text-stone-500">Per subject</p><Link href={`/pricing?subject=${subject.id}`} className="btn-primary mt-5 w-full !px-4 !py-2">Start Practice</Link></article>)}</div></div></section>
    <section id="featured" className="container-page section-space"><div className="flex items-end justify-between gap-5"><div className="section-heading"><p className="eyebrow">Practice with purpose</p><h2>Featured mock tests</h2></div><Link href="/mock-tests" className="shrink-0 text-sm font-bold text-brand-600">View all →</Link></div><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{featuredTests.map((test) => <article className="card card-lift flex h-full flex-col" key={test.id}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{test.main_category}</span><div className="flex items-center gap-2">{test.question_count === 0 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">Coming Soon</span>}<span className="text-sm font-semibold text-stone-500">{test.price ? `₹${test.price}` : "Free"}</span></div></div><h3 className="mt-5 text-lg font-bold">{test.title}</h3><p className="mt-2 text-sm text-stone-500">{test.question_count} questions · {test.duration_minutes} mins · {test.subcategory}</p><Link href={`/mock-tests/${test.id}`} className="btn-primary mt-6 w-full">View test</Link></article>)}{!featuredTests.length && <div className="card text-sm text-stone-500 md:col-span-2 xl:col-span-3">No featured mock tests have been selected yet.</div>}</div></section>
    <section className="border-y border-brand-100 bg-white section-space"><div className="container-page"><div className="section-heading"><p className="eyebrow">Why JK Test Point</p><h2>Everything you need to improve</h2></div><div className="mt-8 grid gap-5 md:grid-cols-3">{features.map(([title, text], index) => <div className="card card-lift" key={title}><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-bold text-brand-600">0{index + 1}</span><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-500">{text}</p></div>)}</div></div></section>
  </>;
}
