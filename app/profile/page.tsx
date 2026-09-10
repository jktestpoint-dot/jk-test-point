import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";

export default async function ProfilePage() {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  const user = token ? await getAuthenticatedStudent(token) : null;
  if (!user) redirect("/login?next=/profile");

  return <section className="container-page section-space">
    <div className="mx-auto max-w-4xl">
      <div className="page-intro">
        <p className="eyebrow">My account</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Profile &amp; settings</h1>
        <p className="mt-3 max-w-2xl text-stone-600">View your account information and continue where you left off.</p>
      </div>

      <div className="card mt-7">
        <h2 className="text-lg font-bold">Profile information</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Name</dt>
            <dd className="mt-2 font-semibold text-stone-800">{user.name}</dd>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Email address</dt>
            <dd className="mt-2 break-words font-semibold text-stone-800">{user.email || "Email unavailable"}</dd>
          </div>
        </dl>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-bold">Account</h2>
        <p className="mt-2 text-sm text-stone-500">Quickly access your preparation and saved study material.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link className="btn-secondary w-full" href="/dashboard">Dashboard</Link>
          <Link className="btn-secondary w-full" href="/analytics">Analytics</Link>
          <Link className="btn-secondary w-full" href="/attempts">Attempts history</Link>
          <Link className="btn-secondary w-full" href="/bookmarks">Saved Questions</Link>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">Your profile information is managed through your verified account. More account settings will appear here when they are securely supported.</p>
      </div>
    </div>
  </section>;
}
