import { redirect } from "next/navigation";
import { FeaturedTestsAdmin } from "@/components/FeaturedTestsAdmin";
import { requireAdmin } from "@/lib/admin-auth";

export default async function FeaturedTestsPage() {
  if (!await requireAdmin()) redirect("/dashboard");
  return <FeaturedTestsAdmin />;
}
