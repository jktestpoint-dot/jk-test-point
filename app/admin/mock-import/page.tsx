import { redirect } from "next/navigation";
import { AdminMockImport } from "@/components/AdminMockImport";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminMockImportPage() {
  if (!await requireAdmin()) redirect("/dashboard");
  return <AdminMockImport />;
}
