import { redirect } from "next/navigation";
import { AdminQuestionImport } from "@/components/AdminQuestionImport";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminQuestionsPage() {
  if (!await requireAdmin()) redirect("/dashboard");
  return <AdminQuestionImport />;
}
