import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { getPublishedCatalogTest } from "@/lib/test-catalog";
import { TestLeaderboard } from "@/components/TestLeaderboard";

export default async function MockTestLeaderboardPage({ params }: { params: { id: string } }) {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  const user = token ? await getAuthenticatedStudent(token) : null;
  const destination = `/mock-tests/${params.id}/leaderboard`;

  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  // This matches the existing mock detail page's published-test boundary. The
  // leaderboard content itself is fetched only through the safe API route.
  const test = await getPublishedCatalogTest(params.id).catch(() => null);
  if (!test) {
    return <section className="container-page py-20 text-center">
      <p className="eyebrow">Leaderboard</p>
      <h1 className="mt-2 text-2xl font-bold">Test not found</h1>
      <p className="mt-3 text-stone-600">This mock test is unavailable or is no longer published.</p>
    </section>;
  }

  return <TestLeaderboard testId={test.id} testTitle={test.title} />;
}
