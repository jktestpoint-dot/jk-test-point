import { redirect } from "next/navigation";
import { AdminAppendMockQuestions } from "@/components/AdminAppendMockQuestions";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminAppendMockQuestionsPage() {
  if (!await requireAdmin()) redirect("/dashboard");
  return <AdminAppendMockQuestions />;
}
