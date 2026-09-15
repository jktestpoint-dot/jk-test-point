import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { TestRunner } from "@/components/TestRunner";
import { getPublishedCatalogTest } from "@/lib/test-catalog";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";
import { hasActiveMockEntitlement } from "@/lib/subject-entitlement";

export default async function Attempt({ params }: { params: { id: string } }) {
  const test = await getPublishedCatalogTest(params.id).catch(() => null);
  if (!test) notFound();
  if (test.price > 0) {
    const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
    const user = token ? await getAuthenticatedStudent(token) : null;
    if (!token || !user) redirect(`/login?next=/mock-tests/${encodeURIComponent(params.id)}/attempt`);
    if (!await hasActiveMockEntitlement(token, test.id)) redirect(`/mock-tests/${encodeURIComponent(test.id)}`);
  }
  return <TestRunner testId={test.id} />;
}
