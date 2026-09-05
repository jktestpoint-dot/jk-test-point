import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminDashboard() {
  if (!await requireAdmin()) redirect("/dashboard");
  return <section className="container-page py-10"><p className="eyebrow">Administrator</p><h1 className="mt-2 text-3xl font-bold">Admin Dashboard</h1><p className="mt-3 text-stone-500">Manage your published mock tests.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/admin/featured-tests" className="btn-primary">Featured mock tests</Link><Link href="/admin/subject-mcqs" className="btn-secondary">Subject MCQ import</Link></div></section>;
}
