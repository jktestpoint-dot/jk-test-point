import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminSubjectMcqImport } from "@/components/AdminSubjectMcqImport";

export default async function AdminSubjectMcqsPage() {
  if (!await requireAdmin()) redirect("/dashboard");
  return <AdminSubjectMcqImport />;
}
